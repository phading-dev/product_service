import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getSeasonAndEpisodeForPublisher,
  listNextEpisodesForPublisher,
  listPrevEpisodesForPublisher,
  updateEpisodeStatement,
  updateSeasonStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { Statement } from "@google-cloud/spanner/build/src/transaction";
import { UpdateEpisodeOrderHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  UpdateEpisodeOrderRequestBody,
  UpdateEpisodeOrderResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newExchangeSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class UpdateEpisodeOrderHandler extends UpdateEpisodeOrderHandlerInterface {
  public static create(): UpdateEpisodeOrderHandler {
    return new UpdateEpisodeOrderHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
    body: UpdateEpisodeOrderRequestBody,
    sessionStr: string,
  ): Promise<UpdateEpisodeOrderResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.episodeId) {
      throw newBadRequestError(`"episodeId" is required.`);
    }
    if (body.toIndex == null) {
      throw newBadRequestError(`"toIndex" is required.`);
    }
    if (body.toIndex < 1) {
      throw newBadRequestError(`"toIndex" must be positive.`);
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
        `Account ${accountId} not allowed to update episode order.`,
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
      if (body.toIndex > sData.totalEpisodes) {
        throw newBadRequestError(
          `Season ${body.seasonId} episode ${body.episodeId}'s target index ${body.toIndex} is larger than the total number of episodes which is ${sData.totalEpisodes}.`,
        );
      }
      let currentIndex = eData.index;
      if (body.toIndex === currentIndex) {
        throw newBadRequestError(
          `Season ${body.seasonId} episode ${body.episodeId} is already at index ${body.toIndex}.`,
        );
      }
      eData.index = body.toIndex;
      sData.lastChangeTimeMs = this.getNow();
      let statements: Array<Statement> = [
        updateEpisodeStatement(eData),
        updateSeasonStatement(sData),
      ];
      if (body.toIndex < currentIndex) {
        let episodes = await listPrevEpisodesForPublisher(
          transaction,
          accountId,
          body.seasonId,
          currentIndex,
          currentIndex - body.toIndex,
        );
        for (let episode of episodes) {
          episode.eData.index += 1;
          statements.push(updateEpisodeStatement(episode.eData));
        }
      } else {
        // toIndex > currentIndex
        let episodes = await listNextEpisodesForPublisher(
          transaction,
          accountId,
          body.seasonId,
          currentIndex,
          body.toIndex - currentIndex,
        );
        for (let episode of episodes) {
          episode.eData.index -= 1;
          statements.push(updateEpisodeStatement(episode.eData));
        }
      }
      await transaction.batchUpdate(statements);
      await transaction.commit();
    });
    return {};
  }
}
