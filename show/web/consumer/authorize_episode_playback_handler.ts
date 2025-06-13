import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { getPublishedEpisode } from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { AuthorizeEpisodePlaybackHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  AuthorizeEpisodePlaybackRequestBody,
  AuthorizeEpisodePlaybackResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class AuthorizeEpisodePlaybackHandler extends AuthorizeEpisodePlaybackHandlerInterface {
  public static create(): AuthorizeEpisodePlaybackHandler {
    return new AuthorizeEpisodePlaybackHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      ENV_VARS.r2VideoPublicAccessOrigin,
      () => Date.now(),
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private videoPublicAccessOrigin: string,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: AuthorizeEpisodePlaybackRequestBody,
    sessionStr: string,
  ): Promise<AuthorizeEpisodePlaybackResponse> {
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
          checkCanConsume: true,
        },
      }),
    );
    if (!capabilities.canConsume) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to authorize episode playbacks.`,
      );
    }
    let rows = await getPublishedEpisode(this.database, {
      episodeSeasonIdEq: body.seasonId,
      seasonStateEq: SeasonState.PUBLISHED,
      episodeEpisodeIdEq: body.episodeId,
      episodeStateEq: EpisodeState.PUBLISHED,
    });
    if (rows.length === 0) {
      throw newNotFoundError(
        `Season ${body.seasonId} episode ${body.episodeId} is not found.`,
      );
    }
    let row = rows[0];
    return {
      videoUrl:
        row.episodePremiereTimeMs <= this.getNow()
          ? `${this.videoPublicAccessOrigin}/${row.episodeVideoContainerCached.r2RootDirname}/${row.episodeVideoContainerCached.r2MasterPlaylistFilename}`
          : undefined,
    };
  }
}
