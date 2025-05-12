import { MAX_LIST_SEASONS_ITEMS } from "../../../common/constants";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { listPublishedSeasonsByPremiereTimeAndPublisher } from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { getLatestSeasonGradeAndSummarizeSeason } from "./common/get_latest_season_grade_and_summarize_season";
import { Database } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { ListSeasonsByRecentPremiereTimeAndPublisherHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import { SeasonSummary } from "@phading/product_service_interface/show/web/consumer/info";
import {
  ListSeasonsByRecentPremiereTimeAndPublisherRequestBody,
  ListSeasonsByRecentPremiereTimeAndPublisherResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { newBadRequestError } from "@selfage/http_error";
import { TzDate } from "@selfage/tz_date";

export class ListSeasonsByRecentPremiereTimeAndPublisherHandler extends ListSeasonsByRecentPremiereTimeAndPublisherHandlerInterface {
  public static create(): ListSeasonsByRecentPremiereTimeAndPublisherHandler {
    return new ListSeasonsByRecentPremiereTimeAndPublisherHandler(
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
    body: ListSeasonsByRecentPremiereTimeAndPublisherRequestBody,
  ): Promise<ListSeasonsByRecentPremiereTimeAndPublisherResponse> {
    if (!body.publisherId) {
      throw newBadRequestError(`"publisherId" is required.`);
    }
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
    let seasonRows = await listPublishedSeasonsByPremiereTimeAndPublisher(
      this.database,
      {
        seasonStateEq: SeasonState.PUBLISHED,
        seasonPublisherIdEq: body.publisherId,
        seasonRecentPremiereTimeMsLt: body.premiereTimeCursor ?? nowDate.getTime(),
        seasonRecentPremiereTimeMsEq: body.premiereTimeCursor ?? nowDate.getTime(),
        seasonCreatedTimeMsLt: body.createdTimeCursor ?? nowDate.getTime(),
        limit: body.limit,
      },
    );
    let seasons = new Array<SeasonSummary>(seasonRows.length);
    await Promise.all(
      seasonRows.map(async (row, i) => {
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
