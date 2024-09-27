import {
  EFFECTIVE_TIMESTAMP_GAP_MS,
  FAR_FUTURE_TIME,
} from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getLastTwoSeasonGrade,
  getSeasonState,
  insertSeasonGrade,
  updateSeasonGrade,
  updateSeasonGradeAndStartTimestamp,
  updateSeasonGradeEndTimestamp,
  updateSeasonLastChangeTimestamp,
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
    return new UpdateSeasonGradeHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
      Date.now(),
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private getNow: () => number,
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
    let { userSession, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to update season grade.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let now = this.getNow();
      let [stateRows, seasonGradeRows] = await Promise.all([
        getSeasonState((query) => transaction.run(query), body.seasonId),
        getLastTwoSeasonGrade(
          (query) => transaction.run(query),
          body.seasonId,
          now,
        ),
      ]);
      if (stateRows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      if (stateRows[0].seasonState === SeasonState.ARCHIVED) {
        throw newBadRequestError(
          `Season ${body.seasonId} is archived and cannot be updated anymore.`,
        );
      }
      if (stateRows[0].seasonState === SeasonState.DRAFT) {
        if (seasonGradeRows.length !== 1) {
          throw newInternalServerErrorError(
            `Season ${body.seasonId} has more than 1 grade while in draft state.`,
          );
        }
        await Promise.all([
          updateSeasonGrade(
            (query) => transaction.run(query),
            body.grade,
            body.seasonId,
            seasonGradeRows[0].sgStartTimestamp,
          ),
          updateSeasonLastChangeTimestamp(
            (query) => transaction.run(query),
            body.seasonId,
          ),
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

        if (seasonGradeRows.length === 1) {
          if (seasonGradeRows[0].sgStartTimestamp > now) {
            throw newInternalServerErrorError(
              `Season ${body.seasonId} has invalid grades. Grade started at ${seasonGradeRows[0].sgStartTimestamp} should be smaller than now ${now}.`,
            );
          }
          await Promise.all([
            updateSeasonGradeEndTimestamp(
              (query) => transaction.run(query),
              body.effectiveTimestamp,
              body.seasonId,
              seasonGradeRows[0].sgStartTimestamp,
            ),
            insertSeasonGrade(
              (query) => transaction.run(query),
              body.seasonId,
              body.effectiveTimestamp,
              FAR_FUTURE_TIME,
            ),
            updateSeasonLastChangeTimestamp(
              (query) => transaction.run(query),
              body.seasonId,
            ),
          ]);
        } else {
          if (seasonGradeRows[0].sgStartTimestamp <= now) {
            throw newInternalServerErrorError(
              `Season ${body.seasonId} has invalid grades. Grade started at ${seasonGradeRows[0].sgStartTimestamp} should be larger than now ${now}.`,
            );
          }
          if (seasonGradeRows[1].sgStartTimestamp > now) {
            throw newInternalServerErrorError(
              `Season ${body.seasonId} has invalid grades. Grade started at ${seasonGradeRows[1].sgStartTimestamp} should be smaller than now ${now}.`,
            );
          }
          await Promise.all([
            updateSeasonGradeEndTimestamp(
              (query) => transaction.run(query),
              body.effectiveTimestamp,
              body.seasonId,
              seasonGradeRows[1].sgStartTimestamp,
            ),
            updateSeasonGradeAndStartTimestamp(
              (query) => transaction.run(query),
              body.effectiveTimestamp,
              body.grade,
              body.seasonId,
              seasonGradeRows[0].sgStartTimestamp,
            ),
            updateSeasonLastChangeTimestamp(
              (query) => transaction.run(query),
              body.seasonId,
            ),
          ]);
        }
      }
      await transaction.commit();
    });
    return {};
  }
}
