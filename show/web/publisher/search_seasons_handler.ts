import { MAX_LIST_SEASONS_ITEMS } from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  ContinuedSearchSeasonsForPublisherRow,
  SearchSeasonsForPublisherRow,
  continuedSearchSeasonsForPublisher,
  searchSeasonsForPublisher,
} from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { SearchSeasonsHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  SearchSeasonsRequestBody,
  SearchSeasonsResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { SeasonSummary } from "@phading/product_service_interface/show/web/publisher/summary";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class SearchSeasonsHandler extends SearchSeasonsHandlerInterface {
  public static create(): SearchSeasonsHandler {
    return new SearchSeasonsHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      ENV_VARS.r2SeasonCoverImagePublicAccessDomain,
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private coverImagePublicAccessDomain: string,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: SearchSeasonsRequestBody,
    sessionStr: string,
  ): Promise<SearchSeasonsResponse> {
    if (!body.query) {
      throw newBadRequestError(`"query" is required.`);
    }
    if (!body.limit) {
      throw newBadRequestError(`"limit" is required.`);
    }
    if (body.limit > MAX_LIST_SEASONS_ITEMS) {
      throw newBadRequestError(`"limit" is too large.`);
    }
    let { accountId, capabilities } = await this.serviceClient.send(
      newFetchSessionAndCheckCapabilityRequest({
        signedSession: sessionStr,
        capabilitiesMask: {
          checkCanPublish: true,
        },
      }),
    );
    if (!capabilities.canPublish) {
      throw newUnauthorizedError(
        `Account ${accountId} is not allowed to search seasons.`,
      );
    }
    let seasonRows: Array<
      SearchSeasonsForPublisherRow | ContinuedSearchSeasonsForPublisherRow
    >;
    if (!body.scoreCursor) {
      seasonRows = await searchSeasonsForPublisher(this.database, {
        seasonPublisherIdEq: accountId,
        seasonFullTextSearch: body.query,
        seasonFullTextScoreOrderBy: body.query,
        limit: body.limit,
        seasonFullTextScoreSelect: body.query,
      });
    } else {
      seasonRows = await continuedSearchSeasonsForPublisher(this.database, {
        seasonPublisherIdEq: accountId,
        seasonFullTextSearch: body.query,
        seasonFullTextScoreWhereLt: body.query,
        seasonFullTextScoreLt: body.scoreCursor,
        seasonFullTextScoreWhereEq: body.query,
        seasonFullTextScoreEq: body.scoreCursor,
        seasonCreatedTimeMsGt: body.createdTimeCursor,
        seasonFullTextScoreOrderBy: body.query,
        limit: body.limit,
        seasonFullTextScoreSelect: body.query,
      });
    }
    return {
      seasons: seasonRows.map(
        (row): SeasonSummary => ({
          seasonId: row.seasonSeasonId,
          name: row.seasonName,
          coverImageUrl: row.seasonCoverImageR2Filename
            ? `${this.coverImagePublicAccessDomain}/${row.seasonCoverImageR2Filename}`
            : undefined,
          totalEpisodes: row.seasonTotalEpisodes,
          lastChangeTimeMs: row.seasonLastChangeTimeMs,
          averageRating: row.seasonAverageRating,
        }),
      ),
      scoreCursor:
        seasonRows.length === body.limit
          ? seasonRows[seasonRows.length - 1].seasonFullTextScore
          : undefined,
      createdTimeCursor:
        seasonRows.length === body.limit
          ? seasonRows[seasonRows.length - 1].seasonCreatedTimeMs
          : undefined,
    };
  }
}
