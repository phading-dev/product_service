import { MAX_LIST_SEASONS_ITEMS } from "../../../common/constants";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { listPublishedSeasonsByRating } from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { getLatestSeasonGradeAndSummarizeSeason } from "./common/get_latest_season_grade_and_summarize_season";
import { Database } from "@google-cloud/spanner";
import { VALID_RATINGS } from "@phading/constants/show";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { ListSeasonsByRatingHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import { SeasonSummary } from "@phading/product_service_interface/show/web/consumer/info";
import {
  ListSeasonsByRatingRequestBody,
  ListSeasonsByRatingResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { newBadRequestError } from "@selfage/http_error";
import { TzDate } from "@selfage/tz_date";

export class ListSeasonsByRatingHandler extends ListSeasonsByRatingHandlerInterface {
  public static create(): ListSeasonsByRatingHandler {
    return new ListSeasonsByRatingHandler(
      SPANNER_DATABASE,
      ENV_VARS.r2SeasonCoverImagePublicAccessDomain,
      () => new Date(),
    );
  }

  public constructor(
    private database: Database,
    private coverImagePublicAccessDomain: string,
    private getNowDate: () => Date,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: ListSeasonsByRatingRequestBody,
  ): Promise<ListSeasonsByRatingResponse> {
    if (!body.limit) {
      throw newBadRequestError(`"limit" is required.`);
    }
    if (body.limit > MAX_LIST_SEASONS_ITEMS) {
      throw newBadRequestError(`"limit" is too large.`);
    }
    let nowDate = this.getNowDate();
    let now = nowDate.valueOf();
    let todayStr = TzDate.fromDate(
      nowDate,
      ENV_VARS.timezoneNegativeOffset,
    ).toLocalDateISOString();
    let ratingCursor =
      body.ratingCursor ?? VALID_RATINGS[VALID_RATINGS.length - 1] + 1;
    let rows = await listPublishedSeasonsByRating(this.database, {
      seasonStateEq: SeasonState.PUBLISHED,
      seasonAverageRatingLt: ratingCursor,
      seasonAverageRatingEq: ratingCursor,
      seasonCreatedTimeMsLt: body.createdTimeCursor ?? now,
      limit: body.limit,
    });
    let seasons = new Array<SeasonSummary>(rows.length);
    await Promise.all(
      rows.map(async (row, i) => {
        await getLatestSeasonGradeAndSummarizeSeason(
          this.database,
          this.coverImagePublicAccessDomain,
          todayStr,
          row,
          i,
          seasons,
        );
      }),
    );
    return {
      seasons,
      ratingCursor:
        rows.length === body.limit
          ? rows[rows.length - 1].seasonAverageRating
          : undefined,
      createdTimeCursor:
        rows.length === body.limit
          ? rows[rows.length - 1].seasonCreatedTimeMs
          : undefined,
    };
  }
}
