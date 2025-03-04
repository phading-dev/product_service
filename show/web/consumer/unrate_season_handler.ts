import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteIndividualSeasonRatingStatement,
  getIndividualSeasonRating,
  getSeasonRating,
  updateSeasonRatingStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { UnrateSeasonHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  UnrateSeasonRequestBody,
  UnrateSeasonResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { newExchangeSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newInternalServerErrorError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class UnrateSeasonHandler extends UnrateSeasonHandlerInterface {
  public static create(): UnrateSeasonHandler {
    return new UnrateSeasonHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
    body: UnrateSeasonRequestBody,
    authStr: string,
  ): Promise<UnrateSeasonResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    let { accountId, capabilities } = await this.serviceClient.send(
      newExchangeSessionAndCheckCapabilityRequest({
        signedSession: authStr,
        capabilitiesMask: {
          checkCanConsumeShows: true,
        },
      }),
    );
    if (!capabilities.canConsumeShows) {
      throw newUnauthorizedError(
        `Account ${accountId} is not allowed to unrate season.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let [individualRows, totalRows] = await Promise.all([
        getIndividualSeasonRating(transaction, accountId, body.seasonId),
        getSeasonRating(transaction, body.seasonId),
      ]);
      if (individualRows.length === 0) {
        throw newNotFoundError(
          `Account ${accountId} has not rated season ${body.seasonId}.`,
        );
      }
      if (totalRows.length === 0) {
        throw newInternalServerErrorError(
          `Season rating ${body.seasonId} is not found.`,
        );
      }
      let seasonRatingData = totalRows[0].seasonRatingData;
      let individualSeasonRatingData =
        individualRows[0].individualSeasonRatingData;
      seasonRatingData.totalRatings -= individualSeasonRatingData.rating;
      seasonRatingData.count -= 1;
      seasonRatingData.updatedTimeMs = this.getNow();
      await transaction.batchUpdate([
        deleteIndividualSeasonRatingStatement(accountId, body.seasonId),
        updateSeasonRatingStatement(seasonRatingData),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
