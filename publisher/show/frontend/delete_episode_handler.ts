import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteEpisodeStatement,
  getEpisode,
  getNextEpisodes,
  getSeasonMetadata,
  updateEpisodeIndexStatement,
  updateSeasonTotalEpisodesStatement,
  updateVideoFileStatement,
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
      let [metadataRows, episodeRows] = await Promise.all([
        getSeasonMetadata(transaction, body.seasonId, userSession.accountId),
        getEpisode(transaction, body.seasonId, body.episodeId),
      ]);
      if (metadataRows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      if (episodeRows.length === 0) {
        throw newNotFoundError(
          `Season ${body.seasonId} episode ${body.episodeId} is not found.`,
        );
      }
      let followingEpisodeRows = await getNextEpisodes(
        transaction,
        body.seasonId,
        episodeRows[0].episodeIndex,
      );
      let statements = followingEpisodeRows.map((row) =>
        updateEpisodeIndexStatement(
          row.episodeIndex - 1,
          body.seasonId,
          row.episodeEpisodeId,
        ),
      );
      statements.push(
        deleteEpisodeStatement(body.seasonId, body.episodeId),
        updateVideoFileStatement(false, episodeRows[0].episodeVideoFilename),
        updateSeasonTotalEpisodesStatement(
          metadataRows[0].seasonTotalEpisodes - 1,
          this.getNow(),
          body.seasonId,
        ),
      );
      await transaction.batchUpdate(statements);
      await transaction.commit();
    });
    return {};
  }
}
