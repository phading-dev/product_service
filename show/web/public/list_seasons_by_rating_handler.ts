import { MAX_LIST_SEASONS_ITEMS } from "../../../common/constants";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { listPublishedSeasonsByRating } from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { getCurrentSeasonGradeAndSummarizeSeason } from "./common/get_current_season_grade_and_summarize_season";
import { Database } from "@google-cloud/spanner";
import { VALID_RATINGS } from "@phading/constants/show";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { ListSeasonsByRatingHandlerInterface } from "@phading/product_service_interface/show/web/public/handler";
import { SeasonSummary } from "@phading/product_service_interface/show/web/public/info";
import {
  ListSeasonsByRatingRequestBody,
  ListSeasonsByRatingResponse,
} from "@phading/product_service_interface/show/web/public/interface";
import { newBadRequestError } from "@selfage/http_error";
import { TzDate } from "@selfage/tz_date";

export class ListSeasonsByRatingHandler extends ListSeasonsByRatingHandlerInterface {
  public static create(): ListSeasonsByRatingHandler {
    return new ListSeasonsByRatingHandler(
      SPANNER_DATABASE,
      ENV_VARS.r2SeasonCoverImagePublicAccessOrigin,
      () => new Date(),
    );
  }

  public constructor(
    private database: Database,
    private coverImagePublicAccessOrigin: string,
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
      seasonCreatedTimeMsLt: body.createdTimeCursor ?? nowDate.getTime(),
      limit: body.limit,
    });
    let seasons = new Array<SeasonSummary>(rows.length);
    await Promise.all(
      rows.map(async (row, i) => {
        await getCurrentSeasonGradeAndSummarizeSeason(
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
