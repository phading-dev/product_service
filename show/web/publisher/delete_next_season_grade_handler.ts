import { FAR_FUTURE_DATE } from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonGradeStatement,
  getLastSeasonGrades,
  getSeasonForPublisher,
  updateSeasonGradeEndDateStatement,
  updateSeasonLastChangeTimeStatement,
} from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { DeleteNextSeasonGradeHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  DeleteNextSeasonGradeRequestBody,
  DeleteNextSeasonGradeResponse,
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

export class DeleteNextSeasonGradeHandler extends DeleteNextSeasonGradeHandlerInterface {
  public static create(): DeleteNextSeasonGradeHandler {
    return new DeleteNextSeasonGradeHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      () => new Date(),
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private getNowDate: () => Date,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: DeleteNextSeasonGradeRequestBody,
    authStr: string,
  ): Promise<DeleteNextSeasonGradeResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    let { accountId, capabilities } = await this.serviceClient.send(
      newFetchSessionAndCheckCapabilityRequest({
        signedSession: authStr,
        capabilitiesMask: {
          checkCanPublish: true,
        },
      }),
    );
    if (!capabilities.canPublish) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to delete next season grade.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let today = TzDate.fromNewDate(
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
      if (season.seasonState !== SeasonState.PUBLISHED) {
        throw newBadRequestError(
          `Season ${body.seasonId} is not in PUBLISHED state and cannot delete next season grade.`,
        );
      }
      if (seasonGradeRows.length === 0) {
        throw newInternalServerErrorError(
          `Season ${body.seasonId} doesn't have any valid grade.`,
        );
      }
      if (seasonGradeRows.length < 2) {
        throw newBadRequestError(
          `Season ${body.seasonId} doesn't have next grade to delete.`,
        );
      }
      let [nextGrade, currentGrade] = seasonGradeRows;
      await transaction.batchUpdate([
        updateSeasonGradeEndDateStatement({
          seasonGradeSeasonIdEq: currentGrade.seasonGradeSeasonId,
          seasonGradeGradeIdEq: currentGrade.seasonGradeGradeId,
          setEndDate: FAR_FUTURE_DATE,
        }),
        deleteSeasonGradeStatement({
          seasonGradeSeasonIdEq: nextGrade.seasonGradeSeasonId,
          seasonGradeGradeIdEq: nextGrade.seasonGradeGradeId,
        }),
        updateSeasonLastChangeTimeStatement({
          seasonSeasonIdEq: body.seasonId,
          setLastChangeTimeMs: this.getNowDate().valueOf(),
        }),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
