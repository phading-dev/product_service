import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getEpisodeIndex,
  getEpisodesWithinIndexRange,
  updateEpisodeIndex,
  updateSeasonLastChangeTimestamp,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
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
    return new UpdateEpisodeOrderHandler(SPANNER_DATABASE, SERVICE_CLIENT);
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
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
    if (!body.toIndex) {
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
    if (canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to update episode order.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let currentIndexRows = await getEpisodeIndex(
        (query) => transaction.run(query),
        body.seasonId,
        body.episodeId,
      );
      if (currentIndexRows.length) {
        throw newNotFoundError(
          `Season ${body.seasonId} episode ${body.episodeId} is not found.`,
        );
      }
      let currentIndex = currentIndexRows[0].episodeIndex;
      if (body.toIndex === currentIndex) {
        throw newBadRequestError(
          `The target index ${body.toIndex} is already set on the season ${body.seasonId} episode ${body.episodeId}.`,
        );
      }
      let updatePromises = new Array<Promise<void>>();
      if (body.toIndex < currentIndex) {
        let episodeRows = await getEpisodesWithinIndexRange(
          (query) => transaction.run(query),
          body.seasonId,
          body.toIndex,
          currentIndex,
        );
        // index ordered desc
        for (let i = 1; i < episodeRows.length; i++) {
          updatePromises.push(
            updateEpisodeIndex(
              (query) => transaction.run(query),
              episodeRows[i].episodeIndex + 1,
              body.seasonId,
              episodeRows[i].episodeEpisodeId,
            ),
          );
        }
      } else {
        // toIndex > currentIndex
        let episodeRows = await getEpisodesWithinIndexRange(
          (query) => transaction.run(query),
          body.seasonId,
          currentIndex,
          body.toIndex,
        );
        // index ordered desc
        if (episodeRows[0].episodeIndex !== body.toIndex) {
          throw newBadRequestError(
            `The target index ${body.toIndex} is larger than the last episode's index ${episodeRows[0].episodeIndex}.`,
          );
        }
        for (let i = 0; i < episodeRows.length - 1; i++) {
          updatePromises.push(
            updateEpisodeIndex(
              (query) => transaction.run(query),
              episodeRows[i].episodeIndex - 1,
              body.seasonId,
              episodeRows[i].episodeEpisodeId,
            ),
          );
        }
      }
      await Promise.all([
        ...updatePromises,
        updateEpisodeIndex(
          (query) => transaction.run(query),
          body.toIndex,
          body.seasonId,
          body.episodeId,
        ),
        updateSeasonLastChangeTimestamp(
          (query) => transaction.run(query),
          body.seasonId,
        ),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
