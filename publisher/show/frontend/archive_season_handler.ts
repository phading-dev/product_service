import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { deleteAllEpisodeDraftsStatement, deleteAllEpisodesStatement, getAllEpisodeDraftVideoFiles, getAllEpisodeVideoFiles, getSeasonMetadata, insertDeletingCoverImageFileStatement, updateSeasonStateStatement, updateVideoFileStatement } from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { ArchiveSeasonHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  ArchiveSeasonRequestBody,
  ArchiveSeasonResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class ArchiveSeasonHandler extends ArchiveSeasonHandlerInterface {
  public static create(): ArchiveSeasonHandler {
    return new ArchiveSeasonHandler(SPANNER_DATABASE, SERVICE_CLIENT, () => Date.now());
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private getNow: () => number
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
    let { userSession, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (!canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to archive season.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let [metadataRows, draftVideoFiles, videoFiles] = await Promise.all([
        getSeasonMetadata(transaction, body.seasonId, userSession.accountId),
        getAllEpisodeDraftVideoFiles(
          transaction,
          body.seasonId,
        ),
        getAllEpisodeVideoFiles(transaction, body.seasonId),
      ]);
      if (metadataRows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      if (metadataRows[0].seasonState !== SeasonState.PUBLISHED) {
        throw newBadRequestError(
          `Season ${body.seasonId} is not in PUBLISHED state and cannot be archived.`,
        );
      }
      await transaction.batchUpdate([
        insertDeletingCoverImageFileStatement(
          metadataRows[0].seasonCoverImageFilename,
        ),
        ...draftVideoFiles.map((row) =>
          updateVideoFileStatement(
            false,
            row.episodeDraftVideoFilename,
          ),
        ),
        ...videoFiles.map((row) =>
          updateVideoFileStatement(
            false,
            row.episodeVideoFilename,
          ),
        ),
        deleteAllEpisodeDraftsStatement(body.seasonId),
        deleteAllEpisodesStatement(body.seasonId),
        updateSeasonStateStatement(
          SeasonState.ARCHIVED,
          0,
          this.getNow(),
          body.seasonId,
        ),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
