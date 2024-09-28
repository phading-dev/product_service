import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getEpisodeDraftVideoFiles,
  getEpisodeVideoFiles,
  getSeasonCoverImage,
  insertDeletingCoverImageFile,
  insertDeletingVideoFile,
  updateSeasonState,
} from "../../../db/sql";
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
    return new ArchiveSeasonHandler(SPANNER_DATABASE, SERVICE_CLIENT);
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
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
      let [coverImageRows, draftVideoFiles, videoFiles] = await Promise.all([
        getSeasonCoverImage((query) => transaction.run(query), body.seasonId),
        getEpisodeDraftVideoFiles(
          (query) => transaction.run(query),
          body.seasonId,
        ),
        getEpisodeVideoFiles((query) => transaction.run(query), body.seasonId),
      ]);
      if (coverImageRows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      if (coverImageRows[0].seasonState !== SeasonState.PUBLISHED) {
        throw newBadRequestError(
          `Season ${body.seasonId} is not in PUBLISHED state and cannot be archived.`,
        );
      }
      await Promise.all([
        insertDeletingCoverImageFile(
          (query) => transaction.run(query),
          coverImageRows[0].seasonCoverImageFilename,
        ),
        ...draftVideoFiles.map((row) =>
          insertDeletingVideoFile(
            (query) => transaction.run(query),
            row.episodeDraftVideoFilename,
          ),
        ),
        ...videoFiles.map((row) =>
          insertDeletingVideoFile(
            (query) => transaction.run(query),
            row.episodeVideoFilename,
          ),
        ),
        updateSeasonState(
          (query) => transaction.run(query),
          SeasonState.ARCHIVED,
          0,
          body.seasonId,
        ),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
