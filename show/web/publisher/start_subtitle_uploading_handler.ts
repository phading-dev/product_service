import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { getEpisodeForPublisher } from "../../../db/sql";
import { updateSeasonLastChangeTime } from "./common/update_season_last_change_time";
import { Database } from "@google-cloud/spanner";
import { StartSubtitleUploadingHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  StartSubtitleUploadingRequestBody,
  StartSubtitleUploadingResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/node/client";
import { startSubtitleUploading } from "@phading/video_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class StartSubtitleUploadingHandler extends StartSubtitleUploadingHandlerInterface {
  public static create(): StartSubtitleUploadingHandler {
    return new StartSubtitleUploadingHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      () => Date.now(),
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: StartSubtitleUploadingRequestBody,
    sessionStr: string,
  ): Promise<StartSubtitleUploadingResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.episodeId) {
      throw newBadRequestError(`"episodeId" is required.`);
    }
    if (!body.contentLength) {
      throw newBadRequestError(`"contentLength" is required.`);
    }
    if (!body.fileType) {
      throw newBadRequestError(`"fileType" is required.`);
    }
    let { accountId, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (!canPublishShows) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to start subtitle uploading.`,
      );
    }
    let rows = await getEpisodeForPublisher(
      this.database,
      accountId,
      body.seasonId,
      body.episodeId,
    );
    if (rows.length === 0) {
      throw newNotFoundError(
        `Season ${body.seasonId} or episode ${body.episodeId} is not found.`,
      );
    }
    let seasonAndEpisode = rows[0];
    if (!seasonAndEpisode.eData.videoContainerId) {
      throw newBadRequestError(
        `Season ${body.seasonId} episode ${body.episodeId} does not have a video container yet.`,
      );
    }
    let { uploadSessionUrl, byteOffset } = await startSubtitleUploading(
      this.serviceClient,
      {
        containerId: seasonAndEpisode.eData.videoContainerId,
        contentLength: body.contentLength,
        fileType: body.fileType,
      },
    );
    await updateSeasonLastChangeTime(
      this.database,
      accountId,
      body.seasonId,
      this.getNow(),
    );
    return {
      uploadSessionUrl,
      byteOffset,
    };
  }
}
