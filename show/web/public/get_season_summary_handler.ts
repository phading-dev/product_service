import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { getLastSeasonGrades, getPublishedSeason } from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { GetSeasonSummaryHandlerInterface } from "@phading/product_service_interface/show/web/public/handler";
import {
  GetSeasonSummaryRequestBody,
  GetSeasonSummaryResponse,
} from "@phading/product_service_interface/show/web/public/interface";
import {
  newBadRequestError,
  newInternalServerErrorError,
  newNotFoundError,
} from "@selfage/http_error";
import { TzDate } from "@selfage/tz_date";

export class GetSeasonSummaryHandler extends GetSeasonSummaryHandlerInterface {
  public static create(): GetSeasonSummaryHandler {
    return new GetSeasonSummaryHandler(
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
    body: GetSeasonSummaryRequestBody,
  ): Promise<GetSeasonSummaryResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    let todayStr = TzDate.fromNewDate(
      this.getNowDate(),
      ENV_VARS.timezoneNegativeOffset,
    ).toLocalDateISOString();
    let [seasonRows, gradeRows] = await Promise.all([
      getPublishedSeason(this.database, {
        seasonSeasonIdEq: body.seasonId,
        seasonStateEq: SeasonState.PUBLISHED,
      }),
      getLastSeasonGrades(this.database, {
        seasonGradeSeasonIdEq: body.seasonId,
        seasonGradeEndDateGt: todayStr,
        limit: 1,
      }),
    ]);
    if (seasonRows.length === 0) {
      throw newNotFoundError(`Season ${body.seasonId} is not found.`);
    }
    if (gradeRows.length === 0) {
      throw newInternalServerErrorError(
        `Season ${body.seasonId} does not have any grades on today ${todayStr}.`,
      );
    }
    let season = seasonRows[0];
    let grade = gradeRows[0];
    return {
      seasonSummary: {
        seasonId: season.seasonSeasonId,
        publisherId: season.seasonPublisherId,
        name: season.seasonName,
        coverImageUrl: season.seasonCoverImageR2Filename
          ? `${this.coverImagePublicAccessOrigin}/${season.seasonCoverImageR2Filename}`
          : undefined,
        grade: grade.seasonGradeGrade,
        totalEpisodes: season.seasonTotalPublishedEpisodes,
        averageRating: season.seasonAverageRating,
        ratingsCount: season.seasonRatingsCount,
      },
    };
  }
}
