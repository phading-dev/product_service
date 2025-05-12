import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { getLastSeasonGrades, getPublishedSeasonAll } from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { GetSeasonDetailsHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import { NextGrade } from "@phading/product_service_interface/show/web/consumer/info";
import {
  GetSeasonDetailsRequestBody,
  GetSeasonDetailsResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import {
  newBadRequestError,
  newInternalServerErrorError,
  newNotFoundError,
} from "@selfage/http_error";
import { TzDate } from "@selfage/tz_date";

export class GetSeasonDetailsHandler extends GetSeasonDetailsHandlerInterface {
  public static create(): GetSeasonDetailsHandler {
    return new GetSeasonDetailsHandler(
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
    body: GetSeasonDetailsRequestBody,
  ): Promise<GetSeasonDetailsResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    let todayStr = TzDate.fromNewDate(
      this.getNowDate(),
      ENV_VARS.timezoneNegativeOffset,
    ).toLocalDateISOString();
    let [seasonRows, seasonGradeRows] = await Promise.all([
      getPublishedSeasonAll(this.database, {
        seasonSeasonIdEq: body.seasonId,
        seasonStateEq: SeasonState.PUBLISHED,
      }),
      getLastSeasonGrades(this.database, {
        seasonGradeSeasonIdEq: body.seasonId,
        seasonGradeEndDateGt: todayStr,
        limit: 2,
      }),
    ]);
    if (seasonRows.length === 0) {
      throw newNotFoundError(`Season ${body.seasonId} is not found.`);
    }
    if (seasonGradeRows.length === 0) {
      throw newInternalServerErrorError(
        `Season ${body.seasonId} does not have any grades on today ${todayStr}.`,
      );
    }

    let grade: number;
    let nextGrade: NextGrade;
    if (seasonGradeRows.length === 1) {
      grade = seasonGradeRows[0].seasonGradeGrade;
    } else if (seasonGradeRows.length === 2) {
      grade = seasonGradeRows[1].seasonGradeGrade;
      nextGrade = {
        grade: seasonGradeRows[0].seasonGradeGrade,
        effectiveDate: seasonGradeRows[0].seasonGradeStartDate,
      };
    }
    let row = seasonRows[0];
    return {
      seasonDetails: {
        seasonId: row.seasonSeasonId,
        publisherId: row.seasonPublisherId,
        name: row.seasonName,
        description: row.seasonDescription,
        coverImageUrl: `${this.coverImagePublicAccessDomain}/${row.seasonCoverImageR2Filename}`,
        grade,
        nextGrade,
        totalEpisodes: row.seasonTotalPublishedEpisodes,
        averageRating: row.seasonAverageRating,
        ratingsCount: row.seasonRatingsCount,
      },
    };
  }
}
