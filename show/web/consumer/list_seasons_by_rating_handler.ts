import { MAX_LIST_SEASONS_ITEMS } from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { listPublishedSeasonsByRatingForConsumer } from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { VALID_RATINGS } from "@phading/constants/show";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { ListSeasonsByRatingHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  ListSeasonsByRatingRequestBody,
  ListSeasonsByRatingResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { SeasonSummary } from "@phading/product_service_interface/show/web/consumer/season_summary";
import { newExchangeSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class ListSeasonsByRatingHandler extends ListSeasonsByRatingHandlerInterface {
  public static create(): ListSeasonsByRatingHandler {
    return new ListSeasonsByRatingHandler(
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
    body: ListSeasonsByRatingRequestBody,
    sessionStr: string,
  ): Promise<ListSeasonsByRatingResponse> {
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
        `Account ${accountId} not allowed to list seasons by rating.`,
      );
    }
    let ratingCursor =
      body.ratingCursor ?? VALID_RATINGS[VALID_RATINGS.length - 1] + 1;
    let rows = await listPublishedSeasonsByRatingForConsumer(
      this.database,
      SeasonState.PUBLISHED,
      ratingCursor,
      ratingCursor,
      body.updatedTimeCursor ?? this.getNow(),
      body.limit,
    );
    return {
      seasons: rows.map(
        (row): SeasonSummary => ({
          seasonId: row.sData.seasonId,
          publisherId: row.sData.publisherId,
          name: row.sData.name,
          coverImageUrl: `${this.coverImagePublicAccessDomain}/${row.sData.coverImageR2Filename}`,
          totalEpisodes: row.sData.totalEpisodes,
          averageRating: row.srData.averageRating,
        }),
      ),
      ratingCursor:
        rows.length === body.limit
          ? rows[rows.length - 1].srData.averageRating
          : undefined,
      updatedTimeCursor:
        rows.length === body.limit
          ? rows[rows.length - 1].srData.updatedTimeMs
          : undefined,
    };
  }
}
