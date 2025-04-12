import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonRecentPremierTimeUpdatingTasksOfSeasonStatement,
  deleteSeasonStatement,
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
import { DeleteSeasonHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  DeleteSeasonRequestBody,
  DeleteSeasonResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class DeleteSeasonHandler extends DeleteSeasonHandlerInterface {
  public static create(): DeleteSeasonHandler {
    return new DeleteSeasonHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
    body: DeleteSeasonRequestBody,
    sessionStr: string,
  ): Promise<DeleteSeasonResponse> {
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
        `Account ${accountId} not allowed to delete season.`,
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
      if (season.seasonState !== SeasonState.DRAFT) {
        throw newBadRequestError(
          `Season ${body.seasonId} is not in DRAFT state and cannot be deleted anymore.`,
        );
      }
      let now = this.getNow();
      let statements: Array<Statement> = [
        deleteSeasonStatement({ seasonSeasonIdEq: body.seasonId }),
        deleteSeasonRecentPremierTimeUpdatingTasksOfSeasonStatement({
          seasonRecentPremierTimeUpdatingTaskSeasonIdEq: body.seasonId,
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
