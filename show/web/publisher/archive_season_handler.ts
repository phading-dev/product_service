import { FAR_FUTURE_DATE } from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  archiveSeasonStatement,
  deleteAllEpisodesStatement,
  deleteSeasonGradeStatement,
  deleteSeasonRecentPremiereTimeUpdatingTasksOfSeasonStatement,
  getLastSeasonGrades,
  getSeasonForPublisher,
  insertCoverImageDeletingTaskStatement,
  insertVideoContainerDeletingTaskStatement,
  listAllVideoContainersForPublisher,
  updateSeasonGradeEndDateStatement,
} from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { Statement } from "@google-cloud/spanner/build/src/transaction";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { ArchiveSeasonHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  ArchiveSeasonRequestBody,
  ArchiveSeasonResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";
import { TzDate } from "@selfage/tz_date";

export class ArchiveSeasonHandler extends ArchiveSeasonHandlerInterface {
  public static create(): ArchiveSeasonHandler {
    return new ArchiveSeasonHandler(
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
    body: ArchiveSeasonRequestBody,
    sessionStr: string,
  ): Promise<ArchiveSeasonResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
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
        `Account ${accountId} not allowed to archive season.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let seasonRows = await getSeasonForPublisher(transaction, {
        seasonPublisherIdEq: accountId,
        seasonSeasonIdEq: body.seasonId,
      });
      if (seasonRows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      let season = seasonRows[0];
      if (
        season.seasonState !== SeasonState.PUBLISHED &&
        season.seasonState !== SeasonState.TAKEN_DOWN
      ) {
        throw newBadRequestError(
          `Season ${body.seasonId} is not in PUBLISHED or TAKEN_DOWN state and cannot be archived.`,
        );
      }
      let todayStr = TzDate.fromNewDate(
        this.getNowDate(),
        ENV_VARS.timezoneNegativeOffset,
      ).toLocalDateISOString();
      let [episodeRows, seasonGrades] = await Promise.all([
        listAllVideoContainersForPublisher(transaction, {
          seasonPublisherIdEq: accountId,
          episodeSeasonIdEq: body.seasonId,
        }),
        getLastSeasonGrades(transaction, {
          seasonGradeSeasonIdEq: body.seasonId,
          seasonGradeEndDateGt: todayStr,
          limit: 2,
        }),
      ]);
      let now = this.getNowDate().getTime();
      let statements: Array<Statement> = [
        archiveSeasonStatement({
          seasonSeasonIdEq: body.seasonId,
          setState: SeasonState.ARCHIVED,
          setCoverImageR2Filename: undefined,
          setLastChangeTimeMs: now,
        }),
        deleteSeasonRecentPremiereTimeUpdatingTasksOfSeasonStatement({
          seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: body.seasonId,
        }),
        deleteAllEpisodesStatement({
          episodeSeasonIdEq: body.seasonId,
        }),
      ];
      if (season.seasonCoverImageR2Filename) {
        statements.push(
          insertCoverImageDeletingTaskStatement({
            r2Filename: season.seasonCoverImageR2Filename,
            retryCount: 0,
            executionTimeMs: now,
            createdTimeMs: now,
          }),
        );
      }
      for (let episode of episodeRows) {
        statements.push(
          insertVideoContainerDeletingTaskStatement({
            videoContainerId: episode.episodeVideoContainerId,
            retryCount: 0,
            executionTimeMs: now,
            createdTimeMs: now,
          }),
        );
      }
      if (seasonGrades.length === 2) {
        let [nextGrade, currentGrade] = seasonGrades;
        statements.push(
          updateSeasonGradeEndDateStatement({
            seasonGradeSeasonIdEq: currentGrade.seasonGradeSeasonId,
            seasonGradeGradeIdEq: currentGrade.seasonGradeGradeId,
            setEndDate: FAR_FUTURE_DATE,
          }),
          deleteSeasonGradeStatement({
            seasonGradeSeasonIdEq: nextGrade.seasonGradeSeasonId,
            seasonGradeGradeIdEq: nextGrade.seasonGradeGradeId,
          }),
        );
      }
      await transaction.batchUpdate(statements);
      await transaction.commit();
    });
    return {};
  }
}
