import { SPANNER_DATABASE } from "../../common/spanner_database";
import { getSeasonGrade } from "../../db/sql";
import { Database } from "@google-cloud/spanner";
import { GetSeasonGradeHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  GetSeasonGradeRequestBody,
  GetSeasonGradeResponse,
} from "@phading/product_service_interface/show/node/interface";
import {
  newInternalServerErrorError,
  newNotFoundError,
} from "@selfage/http_error";

export class GetSeasonGradeHandler extends GetSeasonGradeHandlerInterface {
  public static create(): GetSeasonGradeHandler {
    return new GetSeasonGradeHandler(SPANNER_DATABASE);
  }

  public constructor(private database: Database) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: GetSeasonGradeRequestBody,
  ): Promise<GetSeasonGradeResponse> {
    let gradeRows = await getSeasonGrade(this.database, {
      seasonGradeSeasonIdEq: body.seasonId,
      seasonGradeStartDateLe: body.date,
      seasonGradeEndDateGt: body.date,
    });
    if (gradeRows.length === 0) {
      throw newNotFoundError(
        `Grade of season ${body.seasonId} for date ${body.date} is not found.`,
      );
    }
    if (gradeRows.length > 1) {
      throw newInternalServerErrorError(
        `Multiple grades of season ${body.seasonId} for date ${body.date} are found.`,
      );
    }
    return {
      grade: gradeRows[0].seasonGradeGrade,
    };
  }
}
