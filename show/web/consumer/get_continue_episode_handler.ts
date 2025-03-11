import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { fetchContinueEpisode } from "./common/continue_episode_fetcher";
import { Database } from "@google-cloud/spanner";
import { newGetLatestWatchedEpisodeRequest } from "@phading/play_activity_service_interface/show/node/client";
import { GetContinueEpisodeHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  GetContinueEpisodeRequestBody,
  GetContinueEpisodeResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { newExchangeSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class GetContinueEpisodeHandler extends GetContinueEpisodeHandlerInterface {
  public static create(): GetContinueEpisodeHandler {
    return new GetContinueEpisodeHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
      Date.now(),
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
    body: GetContinueEpisodeRequestBody,
    sessionStr: string,
  ): Promise<GetContinueEpisodeResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    let { accountId, capabilities } = await this.serviceClient.send(
      newExchangeSessionAndCheckCapabilityRequest({
        signedSession: sessionStr,
        capabilitiesMask: {
          checkCanConsumeShows: true,
        },
      }),
    );
    if (!capabilities.canConsumeShows) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to get continue episode.`,
      );
    }
    let response = await this.serviceClient.send(
      newGetLatestWatchedEpisodeRequest({
        watcherId: accountId,
        seasonId: body.seasonId,
      }),
    );
    let continueEpisode = await fetchContinueEpisode(
      this.database,
      body.seasonId,
      response.episodeId,
      response.episodeIndex,
      response.watchedTimeMs,
      this.getNow(),
    );
    return {
      episode: continueEpisode,
    };
  }
}
