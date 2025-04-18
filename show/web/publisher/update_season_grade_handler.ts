import { FAR_FUTURE_DATE } from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getLastSeasonGrades,
  getSeasonForPublisher,
  insertSeasonGradeStatement,
  updateSeasonGradeEndDateStatement,
  updateSeasonGradeStartDateAndGradeStatement,
  updateSeasonGradeStatement,
  updateSeasonLastChangeTimeStatement,
} from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import {
  MAX_GRADE,
  MIN_GRADE_EFFECTIVE_GAP_DAY,
} from "@phading/constants/show";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { UpdateSeasonGradeHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  UpdateSeasonGradeRequestBody,
  UpdateSeasonGradeResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newInternalServerErrorError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";
import { TzDate } from "@selfage/tz_date";

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
        `Account ${accountId} not allowed to update season grade.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let today = TzDate.fromDate(
        this.getNowDate(),
        ENV_VARS.timezoneNegativeOffset,
      );
      let [seasonRows, seasonGradeRows] = await Promise.all([
        getSeasonForPublisher(transaction, {
          seasonPublisherIdEq: accountId,
          seasonSeasonIdEq: body.seasonId,
        }),
        getLastSeasonGrades(transaction, {
          seasonGradeSeasonIdEq: body.seasonId,
          seasonGradeEndDateGt: today.toLocalDateISOString(),
          limit: 2,
        }),
      ]);
      if (seasonRows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      let season = seasonRows[0];
      if (season.seasonState === SeasonState.ARCHIVED) {
        throw newBadRequestError(
          `Season ${body.seasonId} is archived and cannot be updated anymore.`,
        );
      }
      if (season.seasonState === SeasonState.DRAFT) {
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
        let seasonGrade = seasonGradeRows[0];
        await transaction.batchUpdate([
          updateSeasonGradeStatement({
            seasonGradeSeasonIdEq: seasonGrade.seasonGradeSeasonId,
            seasonGradeGradeIdEq: seasonGrade.seasonGradeGradeId,
            setGrade: body.grade,
          }),
          updateSeasonLastChangeTimeStatement({
            seasonSeasonIdEq: body.seasonId,
            setLastChangeTimeMs: this.getNowDate().valueOf(),
          }),
        ]);
      } else {
        if (!body.effectiveDate) {
          throw newBadRequestError(
            `"effectiveDate" is required when updating grade for the published season ${body.seasonId}.`,
          );
        }
        if (
          isNaN(
            TzDate.fromLocalDateString(
              body.effectiveDate,
              ENV_VARS.timezoneNegativeOffset,
            ).toTimestampMs(),
          )
        ) {
          throw newBadRequestError(
            `"effectiveDate" is not a valid date when updating grade for the published season ${body.seasonId}.`,
          );
        }
        let minDate = today.clone().addDays(MIN_GRADE_EFFECTIVE_GAP_DAY);
        if (body.effectiveDate < minDate.toLocalDateISOString()) {
          throw newBadRequestError(
            `"effectiveDate" ${body.effectiveDate} must be at least ${MIN_GRADE_EFFECTIVE_GAP_DAY} days apart from today ${today.toLocalDateISOString()} when updating grade for the published season ${body.seasonId}.`,
          );
        }

        if (seasonGradeRows.length === 0) {
          throw newInternalServerErrorError(
            `Season ${body.seasonId} doesn't have any valid grade.`,
          );
        } else if (seasonGradeRows.length === 1) {
          let seasonGrade = seasonGradeRows[0];
          if (seasonGrade.seasonGradeStartDate > today.toLocalDateISOString()) {
            throw newInternalServerErrorError(
              `Season ${body.seasonId} has invalid grades. Grade ${seasonGrade.seasonGradeGradeId}'s start date ${seasonGrade.seasonGradeStartDate} should be smaller than today ${today.toLocalDateISOString()}.`,
            );
          }
          await transaction.batchUpdate([
            updateSeasonGradeEndDateStatement({
              seasonGradeSeasonIdEq: seasonGrade.seasonGradeSeasonId,
              seasonGradeGradeIdEq: seasonGrade.seasonGradeGradeId,
              setEndDate: body.effectiveDate,
            }),
            insertSeasonGradeStatement({
              seasonId: body.seasonId,
              gradeId: this.generateUuid(),
              startDate: body.effectiveDate,
              endDate: FAR_FUTURE_DATE,
              grade: body.grade,
            }),
            updateSeasonLastChangeTimeStatement({
              seasonSeasonIdEq: body.seasonId,
              setLastChangeTimeMs: this.getNowDate().valueOf(),
            }),
          ]);
        } else {
          let [laterGrade, currentGrade] = seasonGradeRows;
          if (
            currentGrade.seasonGradeStartDate > today.toLocalDateISOString()
          ) {
            throw newInternalServerErrorError(
              `Season ${body.seasonId} has invalid grades. Grade ${currentGrade.seasonGradeGradeId}'s start date ${currentGrade.seasonGradeStartDate} should be smaller than today ${today.toLocalDateISOString()}.`,
            );
          }
          if (laterGrade.seasonGradeStartDate <= today.toLocalDateISOString()) {
            throw newInternalServerErrorError(
              `Season ${body.seasonId} has invalid grades. Grade ${laterGrade.seasonGradeGradeId}'s start date ${laterGrade.seasonGradeStartDate} should be larger than today ${today.toLocalDateISOString()}.`,
            );
          }
          await transaction.batchUpdate([
            updateSeasonGradeEndDateStatement({
              seasonGradeSeasonIdEq: currentGrade.seasonGradeSeasonId,
              seasonGradeGradeIdEq: currentGrade.seasonGradeGradeId,
              setEndDate: body.effectiveDate,
            }),
            updateSeasonGradeStartDateAndGradeStatement({
              seasonGradeSeasonIdEq: laterGrade.seasonGradeSeasonId,
              seasonGradeGradeIdEq: laterGrade.seasonGradeGradeId,
              setGrade: body.grade,
              setStartDate: body.effectiveDate,
            }),
            updateSeasonLastChangeTimeStatement({
              seasonSeasonIdEq: body.seasonId,
              setLastChangeTimeMs: this.getNowDate().valueOf(),
            }),
          ]);
        }
      }
      await transaction.commit();
    });
    return {};
  }
}
