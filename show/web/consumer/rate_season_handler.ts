import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  checkPresenceOfSeason,
  getIndividualSeasonRating,
  getSeasonRating,
  insertIndividualSeasonRatingStatement,
  insertSeasonRatingStatement,
  updateIndividualSeasonRatingStatement,
  updateSeasonRatingStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { Statement } from "@google-cloud/spanner/build/src/transaction";
import { VALID_RATINGS } from "@phading/constants/show";
import { RateSeasonHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  RateSeasonRequestBody,
  RateSeasonResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class RateSeasonHandler extends RateSeasonHandlerInterface {
  public static create(): RateSeasonHandler {
    return new RateSeasonHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
    body: RateSeasonRequestBody,
    authStr: string,
  ): Promise<RateSeasonResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.rating) {
      throw newBadRequestError(`"rating" is required.`);
    }
    if (VALID_RATINGS.indexOf(body.rating) === -1) {
      throw newBadRequestError(`"rating" is invalid.`);
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
        `Account ${accountId} is not allowed to rate season.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let [seasonRows, individualRows, totalRows] = await Promise.all([
        checkPresenceOfSeason(transaction, {
          seasonSeasonIdEq: body.seasonId,
        }),
        getIndividualSeasonRating(transaction, {
          individualSeasonRatingRaterIdEq: accountId,
          individualSeasonRatingSeasonIdEq: body.seasonId,
        }),
        getSeasonRating(transaction, {
          seasonRatingSeasonIdEq: body.seasonId,
        }),
      ]);
      if (seasonRows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      let statements = new Array<Statement>();
      if (individualRows.length === 0 && totalRows.length === 0) {
        statements.push(
          insertIndividualSeasonRatingStatement({
            seasonId: body.seasonId,
            raterId: accountId,
            rating: body.rating,
            ratedTimeMs: this.getNow(),
          }),
          insertSeasonRatingStatement({
            seasonId: body.seasonId,
            count: 1,
            totalRatings: body.rating,
            averageRating: body.rating,
            updatedTimeMs: this.getNow(),
          }),
        );
      } else if (individualRows.length === 0) {
        let totalRow = totalRows[0];
        let totalRating = totalRow.seasonRatingTotalRatings + body.rating;
        let totalCount = totalRow.seasonRatingCount + 1;
        statements.push(
          insertIndividualSeasonRatingStatement({
            seasonId: body.seasonId,
            raterId: accountId,
            rating: body.rating,
            ratedTimeMs: this.getNow(),
          }),
          updateSeasonRatingStatement({
            seasonRatingSeasonIdEq: body.seasonId,
            setTotalRatings: totalRating,
            setCount: totalCount,
            setAverageRating: totalRating / totalCount,
            setUpdatedTimeMs: this.getNow(),
          }),
        );
      } else {
        let totalRow = totalRows[0];
        let individualRow = individualRows[0];
        let totalRating =
          totalRow.seasonRatingTotalRatings +
          body.rating -
          individualRow.individualSeasonRatingRating;
        statements.push(
          updateIndividualSeasonRatingStatement({
            individualSeasonRatingSeasonIdEq: body.seasonId,
            individualSeasonRatingRaterIdEq: accountId,
            setRating: body.rating,
            setRatedTimeMs: this.getNow(),
          }),
          updateSeasonRatingStatement({
            seasonRatingSeasonIdEq: body.seasonId,
            setTotalRatings: totalRating,
            setCount: totalRow.seasonRatingCount,
            setAverageRating: totalRating / totalRow.seasonRatingCount,
            setUpdatedTimeMs: this.getNow(),
          }),
        );
      }
      await transaction.batchUpdate(statements);
      await transaction.commit();
    });
    return {};
  }
}
