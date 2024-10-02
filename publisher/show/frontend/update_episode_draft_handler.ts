import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getSeasonMetadata,
  updateEpisodeDraftStatement,
  updateSeasonLastChangeTimestampStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { UpdateEpisodeDraftHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  UpdateEpisodeDraftRequestBody,
  UpdateEpisodeDraftResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class UpdateEpisodeDraftHandler extends UpdateEpisodeDraftHandlerInterface {
  public static create(): UpdateEpisodeDraftHandler {
    return new UpdateEpisodeDraftHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
    if (!canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to update episode draft.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let metadataRows = await getSeasonMetadata(
        transaction,
        body.seasonId,
        userSession.accountId,
      );
      if (metadataRows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      if (metadataRows[0].seasonState === SeasonState.ARCHIVED) {
        throw newBadRequestError(
          `Season ${body.seasonId} is archived and cannot update episode draft.`,
        );
      }
      await transaction.batchUpdate([
        updateEpisodeDraftStatement(body.name, body.seasonId, body.episodeId),
        updateSeasonLastChangeTimestampStatement(this.getNow(), body.seasonId),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
