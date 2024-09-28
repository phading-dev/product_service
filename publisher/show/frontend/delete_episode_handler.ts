import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteEpisode,
  getEpisodeIndexAndVideo,
  getEpisodesFollowingIndex,
  getSeasonTotalEpisodes,
  insertDeletingVideoFile,
  updateEpisodeIndex,
  updateSeasonTotalEpisodes,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { DeleteEpisodeHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  DeleteEpisodeRequestBody,
  DeleteEpisodeResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class DeleteEpisodeHandler extends DeleteEpisodeHandlerInterface {
  public static create(): DeleteEpisodeHandler {
    return new DeleteEpisodeHandler(SPANNER_DATABASE, SERVICE_CLIENT);
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
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
    let { userSession, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (!canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to delete episode.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let [indexAndVideoRows, totalEpisodesRows] = await Promise.all([
        getEpisodeIndexAndVideo(
          (query) => transaction.run(query),
          body.seasonId,
          body.episodeId,
        ),
        getSeasonTotalEpisodes(
          (query) => transaction.run(query),
          body.seasonId,
        ),
      ]);
      if (indexAndVideoRows.length === 0) {
        throw newNotFoundError(
          `Season ${body.seasonId} episode ${body.episodeId} is not found.`,
        );
      }
      let followingEpisodeRows = await getEpisodesFollowingIndex(
        (query) => transaction.run(query),
        body.seasonId,
        indexAndVideoRows[0].episodeIndex,
      );
      let updateIndexPromises = followingEpisodeRows.map((row) =>
        updateEpisodeIndex(
          (query) => transaction.run(query),
          row.episodeIndex - 1,
          body.seasonId,
          row.episodeEpisodeId,
        ),
      );
      await Promise.all([
        ...updateIndexPromises,
        insertDeletingVideoFile(
          (query) => transaction.run(query),
          indexAndVideoRows[0].episodeVideoFilename,
        ),
        deleteEpisode(
          (query) => transaction.run(query),
          body.seasonId,
          body.episodeId,
        ),
        updateSeasonTotalEpisodes(
          (query) => transaction.run(query),
          totalEpisodesRows[0].seasonTotalEpisodes - 1,
          body.seasonId,
        ),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
