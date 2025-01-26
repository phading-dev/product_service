import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { getEpisodeForPublisher } from "../../../db/sql";
import { updateSeasonLastChangeTime } from "./common/update_season_last_change_time";
import { Database } from "@google-cloud/spanner";
import { CommitEpisodeStagingDataHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  CommitEpisodeStagingDataRequestBody,
  CommitEpisodeStagingDataResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/node/client";
import { commitVideoContainerStagingData } from "@phading/video_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class CommitEpisodeStagingDataHandler extends CommitEpisodeStagingDataHandlerInterface {
  public static create(): CommitEpisodeStagingDataHandler {
    return new CommitEpisodeStagingDataHandler(
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
    body: CommitEpisodeStagingDataRequestBody,
    sessionStr: string,
  ): Promise<CommitEpisodeStagingDataResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.episodeId) {
      throw newBadRequestError(`"episodeId" is required.`);
    }
    let { accountId, capabilities } = await exchangeSessionAndCheckCapability(
      this.serviceClient,
      {
        signedSession: sessionStr,
        capabilitiesMask: {
          checkCanPublishShows: true,
        },
      },
    );
    if (!capabilities.canPublishShows) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to commit episode staging data.`,
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
    let { success, error } = await commitVideoContainerStagingData(
      this.serviceClient,
      {
        containerId: seasonAndEpisode.eData.videoContainerId,
      },
    );
    await updateSeasonLastChangeTime(
      this.database,
      accountId,
      body.seasonId,
      this.getNow(),
    );
    return {
      success,
      error,
    };
  }
}
