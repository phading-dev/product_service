import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { getSeasonAndEpisodeForPublisher } from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { GetEpisodeHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  GetEpisodeRequestBody,
  GetEpisodeResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
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
    return new GetEpisodeHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      ENV_VARS.r2VideoPublicAccessDomain,
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private videoPublicAccessDomain: string,
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
      newFetchSessionAndCheckCapabilityRequest({
        signedSession: sessionStr,
        capabilitiesMask: {
          checkCanPublish: true,
        },
      }),
    );
    if (!capabilities.canPublish) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to get episode details.`,
      );
    }
    let rows = await getSeasonAndEpisodeForPublisher(this.database, {
      seasonPublisherIdEq: accountId,
      episodeSeasonIdEq: body.seasonId,
      episodeEpisodeIdEq: body.episodeId,
    });
    if (rows.length === 0) {
      throw newNotFoundError(
        `Season ${body.seasonId} or episode ${body.episodeId} is not found.`,
      );
    }
    let row = rows[0];
    let videoContainer: VideoContainer;
    if (row.episodeVideoContainerId) {
      ({ videoContainer } = await this.serviceClient.send(
        newGetVideoContainerRequest({
          containerId: row.episodeVideoContainerId,
        }),
      ));
    }
    return {
      episode: {
        seasonName: row.seasonName,
        episodeName: row.episodeName,
        episodeIndex: row.episodeIndex,
        totalPublishedEpisodes: row.seasonTotalPublishedEpisodes,
        videoContainerCached: row.episodeVideoContainerCached,
        videoUrl: row.episodeVideoContainerCached
          ? `${this.videoPublicAccessDomain}/${row.episodeVideoContainerCached.r2RootDirname}/${row.episodeVideoContainerCached.r2MasterPlaylistFilename}`
          : undefined,
        videoContainer,
        state: row.episodeState,
        premiereTimeMs: row.episodePremiereTimeMs,
      },
    };
  }
}
