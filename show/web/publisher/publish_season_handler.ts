import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { getSeasonForPublisher, publishSeasonStatement } from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { PublishSeasonHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  PublishSeasonRequestBody,
  PublishSeasonResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class PublishSeasonHandler extends PublishSeasonHandlerInterface {
  public static create(): PublishSeasonHandler {
    return new PublishSeasonHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
    body: PublishSeasonRequestBody,
    authStr: string,
  ): Promise<PublishSeasonResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    let { accountId, capabilities } = await this.serviceClient.send(
      newFetchSessionAndCheckCapabilityRequest({
        signedSession: authStr,
        capabilitiesMask: {
          checkCanPublish: true,
        },
      }),
    );
    if (!capabilities.canPublish) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to publish season.`,
      );
    }

    await this.database.runTransactionAsync(async (transaction) => {
      let rows = await getSeasonForPublisher(transaction, {
        seasonPublisherIdEq: accountId,
        seasonSeasonIdEq: body.seasonId,
      });
      if (rows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      let row = rows[0];
      if (row.seasonState !== SeasonState.DRAFT) {
        throw newBadRequestError(
          `Season ${body.seasonId} is not in DRAFT state.`,
        );
      }
      if (row.seasonTotalPublishedEpisodes === 0) {
        throw newBadRequestError(
          `Season ${body.seasonId} has no published episodes.`,
        );
      }
      let now = this.getNow();
      await transaction.batchUpdate([
        publishSeasonStatement({
          seasonSeasonIdEq: body.seasonId,
          setState: SeasonState.PUBLISHED,
          setLastChangeTimeMs: now,
          setPublishedTimeMs: now,
        }),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
