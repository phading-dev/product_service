import {
  EFFECTIVE_TIMESTAMP_GAP_MS,
  FAR_FUTURE_TIME,
  MAX_GRADE,
} from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getLastTwoSeasonGrade,
  getSeasonMetadata,
  insertSeasonGradeStatement,
  updateSeasonGradeAndStartTimestampStatement,
  updateSeasonGradeEndTimestampStatement,
  updateSeasonGradeStatement,
  updateSeasonLastChangeTimestampStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { UpdateSeasonGradeHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  UpdateSeasonGradeRequestBody,
  UpdateSeasonGradeResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
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
      () => Date.now(),
      () => crypto.randomUUID(),
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private getNow: () => number,
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
    if (body.grade <= 0 || body.grade > MAX_GRADE) {
      throw newBadRequestError(`"grade" must be within 1 - 99.`);
    }
    let { userSession, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (!canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to update season grade.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let now = this.getNow();
      let [metadataRows, seasonGradeRows] = await Promise.all([
        getSeasonMetadata(transaction, body.seasonId, userSession.accountId),
        getLastTwoSeasonGrade(transaction, body.seasonId, now),
      ]);
      if (metadataRows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      if (metadataRows[0].seasonState === SeasonState.ARCHIVED) {
        throw newBadRequestError(
          `Season ${body.seasonId} is archived and cannot be updated anymore.`,
        );
      }
      if (metadataRows[0].seasonState === SeasonState.DRAFT) {
        if (seasonGradeRows.length !== 1) {
          throw newInternalServerErrorError(
            `Season ${body.seasonId} has ${seasonGradeRows.length} grade(s) while in draft state.`,
          );
        }
        await transaction.batchUpdate([
          updateSeasonGradeStatement(
            body.grade,
            body.seasonId,
            seasonGradeRows[0].seasonGradeGradeId,
          ),
          updateSeasonLastChangeTimestampStatement(now, body.seasonId),
        ]);
      } else {
        if (!body.effectiveTimestamp) {
          throw newBadRequestError(
            `"effectiveTimestamp" is required when updating grade for the published season ${body.seasonId}.`,
          );
        }
        if (body.effectiveTimestamp - now < EFFECTIVE_TIMESTAMP_GAP_MS) {
          throw newBadRequestError(
            `"effectiveTimestamp" must be at least 1 day apart from now when updating grade for the published season ${body.seasonId}.`,
          );
        }
        if (seasonGradeRows.length === 0) {
          throw newInternalServerErrorError(
            `Season ${body.seasonId} doesn't have any valid grade.`,
          );
        } else if (seasonGradeRows.length === 1) {
          if (seasonGradeRows[0].seasonGradeStartTimestamp > now) {
            throw newInternalServerErrorError(
              `Season ${body.seasonId} has invalid grades. Grade ${seasonGradeRows[0].seasonGradeGradeId}'s start timestamp ${seasonGradeRows[0].seasonGradeStartTimestamp} should be smaller than now ${now}.`,
            );
          }
          await transaction.batchUpdate([
            updateSeasonGradeEndTimestampStatement(
              body.effectiveTimestamp,
              body.seasonId,
              seasonGradeRows[0].seasonGradeGradeId,
            ),
            insertSeasonGradeStatement(
              body.seasonId,
              this.generateUuid(),
              body.grade,
              body.effectiveTimestamp,
              FAR_FUTURE_TIME,
            ),
            updateSeasonLastChangeTimestampStatement(now, body.seasonId),
          ]);
        } else {
          if (seasonGradeRows[0].seasonGradeStartTimestamp <= now) {
            throw newInternalServerErrorError(
              `Season ${body.seasonId} has invalid grades. Grade ${seasonGradeRows[0].seasonGradeGradeId}'s start timestamp ${seasonGradeRows[0].seasonGradeStartTimestamp} should be larger than now ${now}.`,
            );
          }
          if (seasonGradeRows[1].seasonGradeStartTimestamp > now) {
            throw newInternalServerErrorError(
              `Season ${body.seasonId} has invalid grades. Grade ${seasonGradeRows[1].seasonGradeGradeId}'s start timestamp ${seasonGradeRows[1].seasonGradeStartTimestamp} should be smaller than now ${now}.`,
            );
          }
          await transaction.batchUpdate([
            updateSeasonGradeEndTimestampStatement(
              body.effectiveTimestamp,
              body.seasonId,
              seasonGradeRows[1].seasonGradeGradeId,
            ),
            updateSeasonGradeAndStartTimestampStatement(
              body.grade,
              body.effectiveTimestamp,
              body.seasonId,
              seasonGradeRows[0].seasonGradeGradeId,
            ),
            updateSeasonLastChangeTimestampStatement(now, body.seasonId),
          ]);
        }
      }
      await transaction.commit();
    });
    return {};
  }
}
