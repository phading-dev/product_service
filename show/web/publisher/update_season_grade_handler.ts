import { toDateUtc } from "../../../common/date_helper";
import { FAR_FUTURE_DATE } from "../../../common/params";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { SeasonGrade } from "../../../db/schema";
import {
  getLastSeasonGrades,
  getSeasonForPublisher,
  insertSeasonGradeStatement,
  updateSeasonGradeStatement,
  updateSeasonStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import {
  MAX_GRADE,
  MIN_GRADE_EFFECTIVE_GAP_DAY,
} from "@phading/constants/show";
import { getTodayWrtTimezone } from "@phading/product_meter_service_interface/node/client";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { UpdateSeasonGradeHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  UpdateSeasonGradeRequestBody,
  UpdateSeasonGradeResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newInternalServerErrorError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class UpdateSeasonGradeHandler extends UpdateSeasonGradeHandlerInterface {
  public static create(): UpdateSeasonGradeHandler {
    return new UpdateSeasonGradeHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      () => new Date(),
      () => crypto.randomUUID(),
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private getNowDate: () => Date,
    private generateUuid: () => string,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: UpdateSeasonGradeRequestBody,
    sessionStr: string,
  ): Promise<UpdateSeasonGradeResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" field is required.`);
    }
    if (!body.grade) {
      throw newBadRequestError(`"grade" field is required.`);
    }
    if (body.grade < 1 || body.grade > MAX_GRADE) {
      throw newBadRequestError(`"grade" is too large or too small.`);
    }
    let { accountId, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (!canPublishShows) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to update season grade.`,
      );
    }
    let { date } = await getTodayWrtTimezone(this.serviceClient, {});
    let todayStr = date;
    await this.database.runTransactionAsync(async (transaction) => {
      let [seasonRows, seasonGradeRows] = await Promise.all([
        getSeasonForPublisher(transaction, accountId, body.seasonId),
        getLastSeasonGrades(transaction, body.seasonId, todayStr, 2),
      ]);
      if (seasonRows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      let { seasonData } = seasonRows[0];
      if (seasonData.state === SeasonState.ARCHIVED) {
        throw newBadRequestError(
          `Season ${body.seasonId} is archived and cannot be updated anymore.`,
        );
      }
      if (seasonData.state === SeasonState.DRAFT) {
        if (seasonGradeRows.length === 0) {
          throw newInternalServerErrorError(
            `Season ${body.seasonId} doesn't have any valid grade.`,
          );
        }
        if (seasonGradeRows.length > 1) {
          throw newInternalServerErrorError(
            `Season ${body.seasonId} has ${seasonGradeRows.length} grade(s) while in draft state.`,
          );
        }
        let { seasonGradeData } = seasonGradeRows[0];
        seasonGradeData.grade = body.grade;
        seasonData.lastChangeTimeMs = this.getNowDate().valueOf();
        await transaction.batchUpdate([
          updateSeasonGradeStatement(seasonGradeData),
          updateSeasonStatement(seasonData),
        ]);
      } else {
        if (!body.effectiveDate) {
          throw newBadRequestError(
            `"effectiveDate" is required when updating grade for the published season ${body.seasonId}.`,
          );
        }
        let effectiveDate = toDateUtc(body.effectiveDate);
        if (isNaN(effectiveDate.valueOf())) {
          throw newBadRequestError(
            `"effectiveDate" is not a valid date when updating grade for the published season ${body.seasonId}.`,
          );
        }
        let minDate = toDateUtc(todayStr);
        minDate.setDate(minDate.getDate() + MIN_GRADE_EFFECTIVE_GAP_DAY);
        if (effectiveDate < minDate) {
          throw newBadRequestError(
            `"effectiveDate" ${body.effectiveDate} must be at least ${MIN_GRADE_EFFECTIVE_GAP_DAY} days apart from today ${todayStr} when updating grade for the published season ${body.seasonId}.`,
          );
        }

        if (seasonGradeRows.length === 0) {
          throw newInternalServerErrorError(
            `Season ${body.seasonId} doesn't have any valid grade.`,
          );
        } else if (seasonGradeRows.length === 1) {
          let { seasonGradeData } = seasonGradeRows[0];
          if (seasonGradeData.startDate > todayStr) {
            throw newInternalServerErrorError(
              `Season ${body.seasonId} has invalid grades. Grade ${seasonGradeData.gradeId}'s start date ${seasonGradeData.startDate} should be smaller than today ${todayStr}.`,
            );
          }
          seasonGradeData.endDate = body.effectiveDate;
          let newGradeData: SeasonGrade = {
            seasonId: seasonData.seasonId,
            gradeId: this.generateUuid(),
            startDate: body.effectiveDate,
            endDate: FAR_FUTURE_DATE,
            grade: body.grade,
          };
          seasonData.lastChangeTimeMs = this.getNowDate().valueOf();
          await transaction.batchUpdate([
            updateSeasonGradeStatement(seasonGradeData),
            insertSeasonGradeStatement(newGradeData),
            updateSeasonStatement(seasonData),
          ]);
        } else {
          let [laterGrade, currentGrade] = seasonGradeRows;
          if (currentGrade.seasonGradeData.startDate > todayStr) {
            throw newInternalServerErrorError(
              `Season ${body.seasonId} has invalid grades. Grade ${currentGrade.seasonGradeData.gradeId}'s start timestamp ${currentGrade.seasonGradeData.startDate} should be smaller than today ${todayStr}.`,
            );
          }
          if (laterGrade.seasonGradeData.startDate <= todayStr) {
            throw newInternalServerErrorError(
              `Season ${body.seasonId} has invalid grades. Grade ${laterGrade.seasonGradeData.gradeId}'s start timestamp ${laterGrade.seasonGradeData.startDate} should be larger than today ${todayStr}.`,
            );
          }
          currentGrade.seasonGradeData.endDate = body.effectiveDate;
          laterGrade.seasonGradeData.grade = body.grade;
          laterGrade.seasonGradeData.startDate = body.effectiveDate;
          seasonData.lastChangeTimeMs = this.getNowDate().valueOf();
          await transaction.batchUpdate([
            updateSeasonGradeStatement(currentGrade.seasonGradeData),
            updateSeasonGradeStatement(laterGrade.seasonGradeData),
            updateSeasonStatement(seasonData),
          ]);
        }
      }
      await transaction.commit();
    });
    return {};
  }
}
