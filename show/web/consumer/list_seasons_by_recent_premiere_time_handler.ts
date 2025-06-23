import { MAX_LIST_SEASONS_ITEMS } from "../../../common/constants";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { listPublishedSeasonsByPremiereTime } from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { getCurrentSeasonGradeAndSummarizeSeason } from "./common/get_current_season_grade_and_summarize_season";
import { Database } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { ListSeasonsByRecentPremiereTimeHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import { SeasonSummary } from "@phading/product_service_interface/show/web/consumer/info";
import {
  ListSeasonsByRecentPremiereTimeRequestBody,
  ListSeasonsByRecentPremiereTimeResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { newBadRequestError } from "@selfage/http_error";
import { TzDate } from "@selfage/tz_date";

export class ListSeasonsByRecentPremiereTimeHandler extends ListSeasonsByRecentPremiereTimeHandlerInterface {
  public static create(): ListSeasonsByRecentPremiereTimeHandler {
    return new ListSeasonsByRecentPremiereTimeHandler(
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
    body: ListSeasonsByRecentPremiereTimeRequestBody,
  ): Promise<ListSeasonsByRecentPremiereTimeResponse> {
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
    let seasonRows = await listPublishedSeasonsByPremiereTime(this.database, {
      seasonStateEq: SeasonState.PUBLISHED,
      seasonRecentPremiereTimeMsLt:
        body.premiereTimeCursor ?? nowDate.getTime(),
      seasonRecentPremiereTimeMsEq:
        body.premiereTimeCursor ?? nowDate.getTime(),
      seasonCreatedTimeMsLt: body.createdTimeCursor ?? nowDate.getTime(),
      limit: body.limit,
    });
    let seasons = new Array<SeasonSummary>(seasonRows.length);
    await Promise.all(
      seasonRows.map(async (row, i) => {
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
      premiereTimeCursor:
        seasonRows.length === body.limit
          ? seasonRows[seasonRows.length - 1].seasonRecentPremiereTimeMs
          : undefined,
      createdTimeCursor:
        seasonRows.length === body.limit
          ? seasonRows[seasonRows.length - 1].seasonCreatedTimeMs
          : undefined,
    };
  }
}
