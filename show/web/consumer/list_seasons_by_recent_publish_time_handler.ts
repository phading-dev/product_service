import { MAX_LIST_SEASONS_ITEMS } from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { listPublishedSeasonsByPublishTimeForConsumer } from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { ListSeasonsByRecentPublishTimeHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  ListSeasonsByRecentPublishTimeRequestBody,
  ListSeasonsByRecentPublishTimeResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { SeasonSummary } from "@phading/product_service_interface/show/web/consumer/season_summary";
import { newExchangeSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class ListSeasonsByRecentPublishTimeHandler extends ListSeasonsByRecentPublishTimeHandlerInterface {
  public static create(): ListSeasonsByRecentPublishTimeHandler {
    return new ListSeasonsByRecentPublishTimeHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      ENV_VARS.r2SeasonCoverImagePublicAccessDomain,
      () => Date.now(),
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private coverImagePublicAccessDomain: string,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: ListSeasonsByRecentPublishTimeRequestBody,
    sessionStr: string,
  ): Promise<ListSeasonsByRecentPublishTimeResponse> {
    if (!body.limit) {
      throw newBadRequestError(`"limit" is required.`);
    }
    if (body.limit > MAX_LIST_SEASONS_ITEMS) {
      throw newBadRequestError(`"limit" is too large.`);
    }
    let { accountId, capabilities } = await this.serviceClient.send(
      newExchangeSessionAndCheckCapabilityRequest({
        signedSession: sessionStr,
        capabilitiesMask: {
          checkCanConsumeShows: true,
        },
      }),
    );
    if (!capabilities.canConsumeShows) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to list seasons by recent publish time.`,
      );
    }
    let seasonRows = await listPublishedSeasonsByPublishTimeForConsumer(
      this.database,
      SeasonState.PUBLISHED,
      body.publishTimeCursor ?? this.getNow(),
      body.limit,
    );
    return {
      seasons: seasonRows.map(
        (row): SeasonSummary => ({
          seasonId: row.sData.seasonId,
          publisherId: row.sData.publisherId,
          name: row.sData.name,
          coverImageUrl: `${this.coverImagePublicAccessDomain}/${row.sData.coverImageR2Filename}`,
          totalEpisodes: row.sData.totalEpisodes,
          averageRating: row.srData.averageRating,
        }),
      ),
      publishTimeCursor:
        seasonRows.length === body.limit
          ? seasonRows[seasonRows.length - 1].sData.recentPublishTimeMs
          : undefined,
    };
  }
}
