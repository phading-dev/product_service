import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  updateEpisodeDraft,
  updateSeasonLastChangeTimestamp,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { UpdateEpisodeDraftHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  UpdateEpisodeDraftRequestBody,
  UpdateEpisodeDraftResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class UpdateEpisodeDraftHandler extends UpdateEpisodeDraftHandlerInterface {
  public static create(): UpdateEpisodeDraftHandler {
    return new UpdateEpisodeDraftHandler(SPANNER_DATABASE, SERVICE_CLIENT);
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: UpdateEpisodeDraftRequestBody,
    sessionStr: string,
  ): Promise<UpdateEpisodeDraftResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.episodeId) {
      throw newBadRequestError(`"episodeId" is required.`);
    }
    let { userSession, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to update episode draft.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      await Promise.all([
        updateEpisodeDraft(
          (query) => transaction.run(query),
          body.name,
          body.seasonId,
          body.episodeId,
        ),
        updateSeasonLastChangeTimestamp(
          (query) => transaction.run(query),
          body.seasonId,
        ),
      ]);
    });
    return {};
  }
}
