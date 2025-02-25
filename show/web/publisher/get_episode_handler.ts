import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { getSeasonAndEpisodeForPublisher } from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { GetEpisodeHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  GetEpisodeRequestBody,
  GetEpisodeResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newExchangeSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import { newGetVideoContainerRequest } from "@phading/video_service_interface/node/client";
import { VideoContainer } from "@phading/video_service_interface/node/video_container";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class GetEpisodeHandler extends GetEpisodeHandlerInterface {
  public static create(): GetEpisodeHandler {
    return new GetEpisodeHandler(SPANNER_DATABASE, SERVICE_CLIENT);
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: GetEpisodeRequestBody,
    sessionStr: string,
  ): Promise<GetEpisodeResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.episodeId) {
      throw newBadRequestError(`"episodeId" is required.`);
    }
    let { accountId, capabilities } = await this.serviceClient.send(
      newExchangeSessionAndCheckCapabilityRequest({
        signedSession: sessionStr,
        capabilitiesMask: {
          checkCanPublishShows: true,
        },
      }),
    );
    if (!capabilities.canPublishShows) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to get episode details.`,
      );
    }
    let rows = await getSeasonAndEpisodeForPublisher(
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
    let { sData, eData } = rows[0];
    let videoContainer: VideoContainer;
    if (eData.videoContainerId) {
      ({ videoContainer } = await this.serviceClient.send(
        newGetVideoContainerRequest({
          containerId: eData.videoContainerId,
        }),
      ));
    }
    return {
      episode: {
        seasonName: sData.name,
        episodeName: eData.name,
        episodeIndex: eData.index,
        videoContainer,
        publishTimeMs: eData.publishTimeMs,
        premierTimeMs: eData.premierTimeMs,
      },
    };
  }
}
