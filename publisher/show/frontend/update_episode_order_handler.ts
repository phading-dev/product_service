import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getEpisode,
  getEpisodesWithinIndexRange,
  getSeasonMetadata,
  updateEpisodeIndexStatement,
  updateSeasonLastChangeTimestampStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { Statement } from "@google-cloud/spanner/build/src/transaction";
import { UpdateEpisodeOrderHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  UpdateEpisodeOrderRequestBody,
  UpdateEpisodeOrderResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
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
    if (body.toIndex <= 0) {
      throw newBadRequestError(`"toIndex" must be larger than 0.`);
    }
    let { userSession, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (!canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to update episode order.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let [metadataRows, episodeRows] = await Promise.all([
        getSeasonMetadata(transaction, body.seasonId, userSession.accountId),
        getEpisode(transaction, body.seasonId, body.episodeId),
      ]);
      if (metadataRows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      if (body.toIndex > metadataRows[0].seasonTotalEpisodes) {
        throw newBadRequestError(
          `The target index ${body.toIndex} is larger than the total number of episodes.`,
        );
      }
      if (episodeRows.length === 0) {
        throw newNotFoundError(
          `Season ${body.seasonId} episode ${body.episodeId} is not found.`,
        );
      }
      let currentIndex = episodeRows[0].episodeIndex;
      if (body.toIndex === currentIndex) {
        throw newBadRequestError(
          `The target index ${body.toIndex} is already set on the season ${body.seasonId} episode ${body.episodeId}.`,
        );
      }
      let statements = new Array<Statement>();
      if (body.toIndex < currentIndex) {
        let episodeRows = await getEpisodesWithinIndexRange(
          transaction,
          body.seasonId,
          body.toIndex,
          currentIndex - 1,
        );
        for (let episode of episodeRows) {
          statements.push(
            updateEpisodeIndexStatement(
              episode.episodeIndex + 1,
              body.seasonId,
              episode.episodeEpisodeId,
            ),
          );
        }
      } else {
        // toIndex > currentIndex
        let episodeRows = await getEpisodesWithinIndexRange(
          transaction,
          body.seasonId,
          currentIndex + 1,
          body.toIndex,
        );
        for (let episode of episodeRows) {
          statements.push(
            updateEpisodeIndexStatement(
              episode.episodeIndex - 1,
              body.seasonId,
              episode.episodeEpisodeId,
            ),
          );
        }
      }
      statements.push(
        updateEpisodeIndexStatement(
          body.toIndex,
          body.seasonId,
          body.episodeId,
        ),
        updateSeasonLastChangeTimestampStatement(this.getNow(), body.seasonId),
      );
      await transaction.batchUpdate(statements);
      await transaction.commit();
    });
    return {};
  }
}
