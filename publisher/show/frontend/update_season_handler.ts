import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { getSeasonMetadata, updateSeason } from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { UpdateSeasonHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  UpdateSeasonRequestBody,
  UpdateSeasonResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class UpdateSeasonHandler extends UpdateSeasonHandlerInterface {
  public static create(): UpdateSeasonHandler {
    return new UpdateSeasonHandler(SPANNER_DATABASE, SERVICE_CLIENT);
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: UpdateSeasonRequestBody,
    sessionStr: string,
  ): Promise<UpdateSeasonResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.name) {
      throw newBadRequestError(`"name" is required.`);
    }
    let { userSession, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (!canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to update season.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let metadataRows = await getSeasonMetadata(
        (query) => transaction.run(query),
        body.seasonId,
        userSession.accountId,
      );
      if (metadataRows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      if (metadataRows[0].seasonState === SeasonState.ARCHIVED) {
        throw newBadRequestError(
          `Season ${body.seasonId} is archived and cannot be updated anymore.`,
        );
      }
      await updateSeason(
        (query) => transaction.run(query),
        body.name,
        body.description,
        body.seasonId,
      );
      await transaction.commit();
    });
    return {};
  }
}
