import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteAllEpisodesStatement,
  deleteVideoContainerCreatingTaskStatement,
  getSeasonForPublisher,
  insertCoverImageDeletingTaskStatement,
  insertVideoContainerDeletingTaskStatement,
  listPrevEpisodesForPublisher,
  updateSeasonStatement,
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
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/node/client";
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
    let { accountId, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (!canPublishShows) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to archive season.`,
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
      if (seasonData.state !== SeasonState.PUBLISHED) {
        throw newBadRequestError(
          `Season ${body.seasonId} is not in PUBLISHED state and cannot be archived.`,
        );
      }
      let now = this.getNow();
      let coverImageToDelete = seasonData.coverImageR2Filename;
      seasonData.state = SeasonState.ARCHIVED;
      seasonData.coverImageR2Filename = undefined;
      seasonData.lastChangeTimeMs = now;
      let statements: Array<Statement> = [
        updateSeasonStatement(seasonData),
        insertCoverImageDeletingTaskStatement(coverImageToDelete, now, now),
        deleteAllEpisodesStatement(body.seasonId),
      ];
      let episodes = await listPrevEpisodesForPublisher(
        transaction,
        accountId,
        body.seasonId,
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
