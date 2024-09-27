import stream = require("stream");
import util = require("util");
import { EPISODE_VIDEO_BUCKET } from "../../../common/cloud_storage";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getEpisodeDraftVideoFile,
  updateEpisodeDraftResumableVideoUpload,
  updateEpisodeDraftUploadedVideo,
  updateSeasonLastChangeTimestamp,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { Bucket } from "@google-cloud/storage";
import { UploadEpisodeVideoHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  UploadEpisodeVideoMetadata,
  UploadEpisodeVideoResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";
import { Readable } from "stream";
import { VideoState } from "@phading/product_service_interface/publisher/show/video_state";
let pipeline = util.promisify(stream.pipeline);

class ByteCounter extends stream.Transform {
  public constructor(public bytes = 0) {
    super();
  }

  _transform(
    chunk: any,
    encoding: BufferEncoding,
    callback: stream.TransformCallback,
  ): void {
    this.bytes += (chunk as Buffer).byteLength;
    callback(chunk);
  }
}

export class UploadEpisodeVideoHandler extends UploadEpisodeVideoHandlerInterface {
  public static create(): UploadEpisodeVideoHandler {
    return new UploadEpisodeVideoHandler(
      SPANNER_DATABASE,
      EPISODE_VIDEO_BUCKET,
      SERVICE_CLIENT,
      () => Date.now(),
    );
  }

  public constructor(
    private database: Database,
    private bucket: Bucket,
    private serviceClient: NodeServiceClient,
    private getNow: () => number
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: Readable,
    metadata: UploadEpisodeVideoMetadata,
    sessionStr: string,
  ): Promise<UploadEpisodeVideoResponse> {
    if (!metadata.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!metadata.episodeId) {
      throw newBadRequestError(`"episodeId" is required.`);
    }
    if (!metadata.resumableVideoUpload) {
      throw newBadRequestError(`"resumableVideoUpload" is required.`);
    }
    let { userSession, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to upload video for episode.`,
      );
    }
    let videoFileRows = await getEpisodeDraftVideoFile(
      (query) => this.database.run(query),
      metadata.seasonId,
      metadata.episodeId,
    );
    if (videoFileRows.length === 0) {
      throw newNotFoundError(
        `Season ${metadata.seasonId} episode ${metadata.episodeId} is not found.`,
      );
    }
    let byteCounter = new ByteCounter(metadata.resumableVideoUpload.byteOffset ?? 0);
    let uri: string;
    let crc32c: string;
    try {
      await pipeline(
        body,
        byteCounter,
        this.bucket
          .file(videoFileRows[0].episodeDraftVideoFilename)
          .createWriteStream({
            uri: metadata.resumableVideoUpload.uri,
            resumeCRC32C: metadata.resumableVideoUpload.crc32c,
            offset: metadata.resumableVideoUpload.byteOffset,
            contentType: metadata.videoContentType,
          })
          .on("uri", (link) => {
            uri = link;
          })
          .on("crc32", (resumeCRC32C) => {
            crc32c = resumeCRC32C;
          }),
      );
    } catch (e) {
      await this.database.runTransactionAsync(async (transaction) => {
        await Promise.all([
          updateEpisodeDraftResumableVideoUpload(
            (query) => transaction.run(query),
            VideoState.UPLOAD_IN_PROGRESS,
            {
              uri,
              crc32c,
              byteOffset: byteCounter.bytes
            },
            metadata.seasonId,
            metadata.episodeId,
          ),
          updateSeasonLastChangeTimestamp(
            (query) => transaction.run(query),
            metadata.seasonId,
          ),
        ]);
      });
      console.log(`${loggingPrefix} upload interrupted. ${e.message}`);
      return {};
    }
    let now = this.getNow();
    await this.database.runTransactionAsync(async (transaction) => {
      await Promise.all([
        updateEpisodeDraftUploadedVideo(
          (query) => transaction.run(query),
          VideoState.UPLOADED,
          {},
          now,
          metadata.videoLength,
          byteCounter.bytes,
          metadata.seasonId,
          metadata.episodeId,
        ),
        updateSeasonLastChangeTimestamp(
          (query) => transaction.run(query),
          metadata.seasonId,
        ),
      ]);
    });
    return {};
  }
}
