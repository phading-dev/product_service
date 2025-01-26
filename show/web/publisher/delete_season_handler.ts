import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteAllEpisodesStatement,
  deleteSeasonMoreStatement,
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
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/node/client";
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
    let { accountId, capabilities } = await exchangeSessionAndCheckCapability(
      this.serviceClient,
      {
        signedSession: sessionStr,
        capabilitiesMask: {
          checkCanPublishShows: true,
        },
      },
    );
    if (!capabilities.canPublishShows) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to delete season.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let rows = await getSeasonForPublisher(
        transaction,
        accountId,
        body.seasonId,
      );
      if (rows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      let { seasonData } = rows[0];
      if (seasonData.state !== SeasonState.DRAFT) {
        throw newBadRequestError(
          `Season ${body.seasonId} is not in DRAFT state and cannot be deleted anymore.`,
        );
      }
      let now = this.getNow();
      let statements: Array<Statement> = [
        deleteSeasonStatement(seasonData.seasonId),
        deleteSeasonMoreStatement(seasonData.seasonId),
        deleteAllEpisodesStatement(seasonData.seasonId),
      ];
      if (seasonData.coverImageR2Filename) {
        statements.push(
          insertCoverImageDeletingTaskStatement(
            seasonData.coverImageR2Filename,
            now,
            now,
          ),
        );
      }
      let episodes = await listPrevEpisodesForPublisher(
        transaction,
        accountId,
        seasonData.seasonId,
        MAX_NUM_OF_EPISODES_PER_SEASON + 1,
        MAX_NUM_OF_EPISODES_PER_SEASON,
      );
      for (let episode of episodes) {
        if (episode.eData.videoContainerId) {
          statements.push(
            insertVideoContainerDeletingTaskStatement(
              episode.eData.videoContainerId,
              now,
              now,
            ),
          );
        } else {
          statements.push(
            deleteVideoContainerCreatingTaskStatement(
              episode.eData.seasonId,
              episode.eData.episodeId,
            ),
          );
        }
      }
      await transaction.batchUpdate(statements);
      await transaction.commit();
    });
    return {};
  }
}
