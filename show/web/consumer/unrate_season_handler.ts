import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteIndividualSeasonRatingStatement,
  getIndividualSeasonRating,
  getPublishedSeasonRatingForConsumer,
  updateSeasonRatingStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { UnrateSeasonHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  UnrateSeasonRequestBody,
  UnrateSeasonResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
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
      let [seasonRows, individualRows] = await Promise.all([
        getPublishedSeasonRatingForConsumer(transaction, {
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
      if (individualRows.length === 0) {
        throw newNotFoundError(
          `Account ${accountId} has not rated season ${body.seasonId}.`,
        );
      }
      let season = seasonRows[0];
      let individualRow = individualRows[0];
      let totalRating =
        season.seasonTotalRatings - individualRow.individualSeasonRatingRating;
      let totalCount = season.seasonRatingsCount - 1;
      await transaction.batchUpdate([
        deleteIndividualSeasonRatingStatement({
          individualSeasonRatingRaterIdEq: accountId,
          individualSeasonRatingSeasonIdEq: body.seasonId,
        }),
        updateSeasonRatingStatement({
          seasonSeasonIdEq: body.seasonId,
          setTotalRatings: totalRating,
          setRatingsCount: totalCount,
          setAverageRating: totalCount === 0 ? 0 : totalRating / totalCount,
          setRatingUpdatedTimeMs: this.getNow(),
        }),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
