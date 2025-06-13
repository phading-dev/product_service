import { MAX_LIST_SEASONS_ITEMS } from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  ContinuedSearchPublishedSeasonsRow,
  SearchPublishedSeasonsRow,
  continuedSearchPublishedSeasons,
  searchPublishedSeasons,
} from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { getLatestSeasonGradeAndSummarizeSeason } from "./common/get_latest_season_grade_and_summarize_season";
import { Database } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { SearchSeasonsHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import { SeasonSummary } from "@phading/product_service_interface/show/web/consumer/info";
import {
  SearchSeasonsRequestBody,
  SearchSeasonsResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";
import { TzDate } from "@selfage/tz_date";

export class SearchSeasonsHandler extends SearchSeasonsHandlerInterface {
  public static create(): SearchSeasonsHandler {
    return new SearchSeasonsHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      ENV_VARS.r2SeasonCoverImagePublicAccessOrigin,
      () => new Date(),
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private coverImagePublicAccessOrigin: string,
    private getNowDate: () => Date,
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
          checkCanConsume: true,
        },
      }),
    );
    if (!capabilities.canConsume) {
      throw newUnauthorizedError(
        `Account ${accountId} is not allowed to search seasons.`,
      );
    }
    let seasonRows: Array<
      SearchPublishedSeasonsRow | ContinuedSearchPublishedSeasonsRow
    >;
    if (!body.scoreCursor) {
      seasonRows = await searchPublishedSeasons(this.database, {
        seasonFullTextSearch: body.query,
        seasonFullTextScoreOrderBy: body.query,
        seasonStateEq: SeasonState.PUBLISHED,
        limit: body.limit,
        seasonFullTextScoreSelect: body.query,
      });
    } else {
      seasonRows = await continuedSearchPublishedSeasons(this.database, {
        seasonFullTextSearch: body.query,
        seasonFullTextScoreWhereLt: body.query,
        seasonFullTextScoreLt: body.scoreCursor,
        seasonFullTextScoreWhereEq: body.query,
        seasonFullTextScoreEq: body.scoreCursor,
        seasonCreatedTimeMsGt: body.createdTimeCursor,
        seasonFullTextScoreOrderBy: body.query,
        seasonStateEq: SeasonState.PUBLISHED,
        limit: body.limit,
        seasonFullTextScoreSelect: body.query,
      });
    }
    let todayStr = TzDate.fromNewDate(
      this.getNowDate(),
      ENV_VARS.timezoneNegativeOffset,
    ).toLocalDateISOString();
    let seasons = new Array<SeasonSummary>(seasonRows.length);
    await Promise.all(
      seasonRows.map(async (row, i) => {
        await getLatestSeasonGradeAndSummarizeSeason(
          this.database,
          this.coverImagePublicAccessOrigin,
          todayStr,
          row,
          i,
          seasons,
        );
      }),
    );
    return {
      seasons,
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
