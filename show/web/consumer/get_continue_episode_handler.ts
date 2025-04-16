import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { fetchContinueEpisode } from "./common/fetch_continue_episode";
import { Database } from "@google-cloud/spanner";
import { newGetLatestWatchedEpisodeRequest } from "@phading/play_activity_service_interface/show/node/client";
import { GetContinueEpisodeHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  GetContinueEpisodeRequestBody,
  GetContinueEpisodeResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class GetContinueEpisodeHandler extends GetContinueEpisodeHandlerInterface {
  public static create(): GetContinueEpisodeHandler {
    return new GetContinueEpisodeHandler(SPANNER_DATABASE, SERVICE_CLIENT);
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
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
      newFetchSessionAndCheckCapabilityRequest({
        signedSession: sessionStr,
        capabilitiesMask: {
          checkCanConsume: true,
        },
      }),
    );
    if (!capabilities.canConsume) {
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
    );
    return {
      continue: continueEpisode,
    };
  }
}
