import { UPLOAD_CLIENT } from "../../../common/cloud_storage";
import { EPISODE_VIDEO_BUCKET_NAME } from "../../../common/env_variables";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getEpisodeDraft,
  getSeasonMetadata,
  updateEpisodeDraftResumableVideoUploadStatement,
  updateEpisodeDraftUploadedVideoStatement,
  updateSeasonLastChangeTimestampStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { UploadEpisodeVideoHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  UploadEpisodeVideoMetadata,
  UploadEpisodeVideoResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { VideoState } from "@phading/product_service_interface/publisher/show/video_state";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import { CloudStorageClient, ResumableUpload } from "@selfage/gcs_client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";
import { Readable } from "stream";

export class UploadEpisodeVideoHandler extends UploadEpisodeVideoHandlerInterface {
  public static create(): UploadEpisodeVideoHandler {
    return new UploadEpisodeVideoHandler(
      SPANNER_DATABASE,
      UPLOAD_CLIENT,
      SERVICE_CLIENT,
      () => Date.now(),
    );
  }

  public constructor(
    private database: Database,
    private uploadClient: CloudStorageClient,
    private serviceClient: NodeServiceClient,
    private getNow: () => number,
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
    if (!metadata.videoSize) {
      throw newBadRequestError(`"videoSize" is required.`);
    }
    if (!metadata.videoDuration) {
      throw newBadRequestError(`"videoDuration" is required.`);
    }
    if (!metadata.videoContentType) {
      throw newBadRequestError(`"videoContentType" is required.`);
    }
    let { userSession, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (!canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to upload video for episode.`,
      );
    }
    let [seasonRows, draftRows] = await Promise.all([
      getSeasonMetadata(
        this.database,
        metadata.seasonId,
        userSession.accountId,
      ),
      getEpisodeDraft(this.database, metadata.seasonId, metadata.episodeId),
    ]);
    if (seasonRows.length === 0) {
      throw newNotFoundError(`Season ${metadata.seasonId} is not found.`);
    }
    if (draftRows.length === 0) {
      throw newNotFoundError(
        `Season ${metadata.seasonId} episode ${metadata.episodeId} is not found.`,
      );
    }
    let resumableUpload: ResumableUpload = {
      url: metadata.resumableVideoUpload.url,
      byteOffset: metadata.resumableVideoUpload.byteOffset,
    };
    let uploadResponse = await this.uploadClient.resumeUpload(
      EPISODE_VIDEO_BUCKET_NAME,
      draftRows[0].episodeDraftVideoFilename,
      body,
      metadata.videoContentType,
      metadata.videoDuration,
      resumableUpload,
      {
        logFn: (info) => console.log(`${loggingPrefix} ${info}`),
      },
    );
    if (!uploadResponse) {
      await this.database.runTransactionAsync(async (transaction) => {
        await transaction.batchUpdate([
          updateEpisodeDraftResumableVideoUploadStatement(
            VideoState.INCOMPLETE,
            {
              url: resumableUpload.url,
              byteOffset: resumableUpload.byteOffset,
            },
            metadata.seasonId,
            metadata.episodeId,
          ),
          updateSeasonLastChangeTimestampStatement(
            this.getNow(),
            metadata.seasonId,
          ),
        ]);
        await transaction.commit();
      });
      return {
        uploaded: false,
        resumableVideoUpload: {
          url: resumableUpload.url,
          byteOffset: resumableUpload.byteOffset,
        },
      };
    } else {
      let now = this.getNow();
      await this.database.runTransactionAsync(async (transaction) => {
        await transaction.batchUpdate([
          updateEpisodeDraftUploadedVideoStatement(
            VideoState.UPLOADED,
            {},
            now,
            metadata.videoDuration,
            metadata.videoSize,
            metadata.seasonId,
            metadata.episodeId,
          ),
          updateSeasonLastChangeTimestampStatement(now, metadata.seasonId),
        ]);
        await transaction.commit();
      });
      return {
        uploaded: true,
        videoUploadedTimestamp: now,
        resumableVideoUpload: {},
      };
    }
  }
}
