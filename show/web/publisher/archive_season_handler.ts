import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  archiveSeasonStatement,
  deleteAllEpisodesStatement,
  deleteSeasonRecentPremiereTimeUpdatingTasksOfSeasonStatement,
  deleteVideoContainerCreatingTaskStatement,
  getSeasonForPublisher,
  insertCoverImageDeletingTaskStatement,
  insertVideoContainerDeletingTaskStatement,
  listPrevEpisodesForPublisher,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { Statement } from "@google-cloud/spanner/build/src/transaction";
import { MAX_NUM_OF_EPISODES_PER_SEASON } from "@phading/constants/show";
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

export class ArchiveSeasonHandler extends ArchiveSeasonHandlerInterface {
  public static create(): ArchiveSeasonHandler {
    return new ArchiveSeasonHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
      let [seasonRows, episodeRows] = await Promise.all([
        getSeasonForPublisher(transaction, {
          seasonPublisherIdEq: accountId,
          seasonSeasonIdEq: body.seasonId,
        }),
        listPrevEpisodesForPublisher(transaction, {
          seasonPublisherIdEq: accountId,
          episodeSeasonIdEq: body.seasonId,
          episodeIndexLt: MAX_NUM_OF_EPISODES_PER_SEASON + 1,
          limit: MAX_NUM_OF_EPISODES_PER_SEASON,
        }),
      ]);
      if (seasonRows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      let season = seasonRows[0];
      if (season.seasonState !== SeasonState.PUBLISHED) {
        throw newBadRequestError(
          `Season ${body.seasonId} is not in PUBLISHED state and cannot be archived.`,
        );
      }
      let now = this.getNow();
      let statements: Array<Statement> = [
        archiveSeasonStatement({
          seasonSeasonIdEq: body.seasonId,
          setState: SeasonState.ARCHIVED,
          setCoverImageR2Filename: undefined,
          setLastChangeTimeMs: now,
        }),
        insertCoverImageDeletingTaskStatement({
          r2Filename: season.seasonCoverImageR2Filename,
          retryCount: 0,
          executionTimeMs: now,
          createdTimeMs: now,
        }),
        deleteSeasonRecentPremiereTimeUpdatingTasksOfSeasonStatement({
          seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: body.seasonId,
        }),
        deleteAllEpisodesStatement({
          episodeSeasonIdEq: body.seasonId,
        }),
      ];
      for (let episode of episodeRows) {
        if (episode.episodeVideoContainerId) {
          statements.push(
            insertVideoContainerDeletingTaskStatement({
              videoContainerId: episode.episodeVideoContainerId,
              retryCount: 0,
              executionTimeMs: now,
              createdTimeMs: now,
            }),
          );
        } else {
          statements.push(
            deleteVideoContainerCreatingTaskStatement({
              videoContainerCreatingTaskSeasonIdEq: episode.episodeSeasonId,
              videoContainerCreatingTaskEpisodeIdEq: episode.episodeEpisodeId,
            }),
          );
        }
      }
      await transaction.batchUpdate(statements);
      await transaction.commit();
    });
    return {};
  }
}
