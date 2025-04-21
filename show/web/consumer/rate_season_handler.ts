import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getIndividualSeasonRating,
  getPublishedSeasonRating,
  insertIndividualSeasonRatingStatement,
  updateIndividualSeasonRatingStatement,
  updateSeasonRatingStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { Statement } from "@google-cloud/spanner/build/src/transaction";
import { VALID_RATINGS } from "@phading/constants/show";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
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
      let [seasonRows, individualRows] = await Promise.all([
        getPublishedSeasonRating(transaction, {
          seasonSeasonIdEq: body.seasonId,
          seasonStateEq: SeasonState.PUBLISHED,
        }),
        getIndividualSeasonRating(transaction, {
          individualSeasonRatingRaterIdEq: accountId,
          individualSeasonRatingSeasonIdEq: body.seasonId,
        }),
      ]);
      if (seasonRows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      let statements = new Array<Statement>();
      if (individualRows.length === 0) {
        let season = seasonRows[0];
        let totalRating = season.seasonTotalRatings + body.rating;
        let totalCount = season.seasonRatingsCount + 1;
        statements.push(
          insertIndividualSeasonRatingStatement({
            seasonId: body.seasonId,
            raterId: accountId,
            rating: body.rating,
            ratedTimeMs: this.getNow(),
          }),
          updateSeasonRatingStatement({
            seasonSeasonIdEq: body.seasonId,
            setTotalRatings: totalRating,
            setRatingsCount: totalCount,
            setAverageRating: totalRating / totalCount,
            setRatingUpdatedTimeMs: this.getNow(),
          }),
        );
      } else {
        let season = seasonRows[0];
        let individualRow = individualRows[0];
        let totalRating =
          season.seasonTotalRatings +
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
            seasonSeasonIdEq: body.seasonId,
            setTotalRatings: totalRating,
            setRatingsCount: season.seasonRatingsCount,
            setAverageRating: totalRating / season.seasonRatingsCount,
            setRatingUpdatedTimeMs: this.getNow(),
          }),
        );
      }
      await transaction.batchUpdate(statements);
      await transaction.commit();
    });
    return {};
  }
}
