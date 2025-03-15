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
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
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
      newFetchSessionAndCheckCapabilityRequest({
        signedSession: authStr,
        capabilitiesMask: {
          checkCanConsume: true,
        },
      }),
    );
    if (!capabilities.canConsume) {
      throw newUnauthorizedError(
        `Account ${accountId} is not allowed to unrate season.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let [individualRows, totalRows] = await Promise.all([
        getIndividualSeasonRating(transaction, {
          individualSeasonRatingRaterIdEq: accountId,
          individualSeasonRatingSeasonIdEq: body.seasonId,
        }),
        getSeasonRating(transaction, { seasonRatingSeasonIdEq: body.seasonId }),
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
      let totalRow = totalRows[0];
      let individualRow = individualRows[0];
      let totalRating =
        totalRow.seasonRatingTotalRatings -
        individualRow.individualSeasonRatingRating;
      let totalCount = totalRow.seasonRatingCount - 1;
      await transaction.batchUpdate([
        deleteIndividualSeasonRatingStatement({
          individualSeasonRatingRaterIdEq: accountId,
          individualSeasonRatingSeasonIdEq: body.seasonId,
        }),
        updateSeasonRatingStatement({
          seasonRatingSeasonIdEq: body.seasonId,
          setTotalRatings: totalRating,
          setCount: totalCount,
          setAverageRating: totalCount === 0 ? 0 : totalRating / totalCount,
          setUpdatedTimeMs: this.getNow(),
        }),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
