import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteEpisodeStatement,
  deleteVideoContainerCreatingTaskStatement,
  getSeasonAndEpisodeForPublisher,
  insertVideoContainerDeletingTaskStatement,
  listNextEpisodesForPublisher,
  updateEpisodeStatement,
  updateSeasonStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { Statement } from "@google-cloud/spanner/build/src/transaction";
import { MAX_NUM_OF_EPISODES_PER_SEASON } from "@phading/constants/show";
import { DeleteEpisodeHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  DeleteEpisodeRequestBody,
  DeleteEpisodeResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newExchangeSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class DeleteEpisodeHandler extends DeleteEpisodeHandlerInterface {
  public static create(): DeleteEpisodeHandler {
    return new DeleteEpisodeHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
    body: DeleteEpisodeRequestBody,
    sessionStr: string,
  ): Promise<DeleteEpisodeResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.episodeId) {
      throw newBadRequestError(`"episodeId" is required.`);
    }
    let { accountId, capabilities } = await this.serviceClient.send(
      newExchangeSessionAndCheckCapabilityRequest({
        signedSession: sessionStr,
        capabilitiesMask: {
          checkCanPublishShows: true,
        },
      }),
    );
    if (!capabilities.canPublishShows) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to delete episode.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let rows = await getSeasonAndEpisodeForPublisher(
        transaction,
        accountId,
        body.seasonId,
        body.episodeId,
      );
      if (rows.length === 0) {
        throw newNotFoundError(
          `Season ${body.seasonId} or episode ${body.episodeId} is not found.`,
        );
      }
      let { sData, eData } = rows[0];
      let now = this.getNow();
      sData.totalEpisodes -= 1;
      sData.lastChangeTimeMs = now;
      let statements: Array<Statement> = [
        updateSeasonStatement(sData),
        deleteEpisodeStatement(eData.seasonId, eData.episodeId),
      ];
      if (eData.videoContainerId) {
        statements.push(
          insertVideoContainerDeletingTaskStatement(
            eData.videoContainerId,
            0,
            now,
            now,
          ),
        );
      } else {
        statements.push(
          deleteVideoContainerCreatingTaskStatement(
            eData.seasonId,
            eData.episodeId,
          ),
        );
      }

      let nextEpisodes = await listNextEpisodesForPublisher(
        transaction,
        accountId,
        eData.seasonId,
        eData.index,
        MAX_NUM_OF_EPISODES_PER_SEASON,
      );
      for (let episode of nextEpisodes) {
        episode.eData.index -= 1;
        statements.push(updateEpisodeStatement(episode.eData));
      }
      await transaction.batchUpdate(statements);
      await transaction.commit();
    });
    return {};
  }
}
