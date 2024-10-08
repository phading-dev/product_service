import crypto = require("crypto");
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getEpisodeDraft,
  getSeasonMetadata,
  insertVideoFileStatement,
  updateEpisodeDraftNewVideoStatement,
  updateVideoFileStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { DeleteEpisodeVideoHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  DeleteEpisodeVideoRequestBody,
  DeleteEpisodeVideoResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { VideoState } from "@phading/product_service_interface/publisher/show/video_state";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class DeleteEpisodeVideoHandler extends DeleteEpisodeVideoHandlerInterface {
  public static create(): DeleteEpisodeVideoHandler {
    return new DeleteEpisodeVideoHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
      crypto.randomUUID(),
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private generateUuid: () => string,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: DeleteEpisodeVideoRequestBody,
    sessionStr: string,
  ): Promise<DeleteEpisodeVideoResponse> {
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
        `Account ${userSession.accountId} not allowed to archive season.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let [metadataRows, draftRows] = await Promise.all([
        getSeasonMetadata(transaction, body.seasonId, userSession.accountId),
        getEpisodeDraft(transaction, body.seasonId, body.episodeId),
      ]);
      if (metadataRows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      if (draftRows.length === 0) {
        throw newNotFoundError(
          `Season ${body.seasonId} episode draft ${body.episodeId} is not found.`,
        );
      }
      let filename = this.generateUuid();
      await transaction.batchUpdate([
        updateEpisodeDraftNewVideoStatement(
          filename,
          VideoState.INCOMPLETE,
          {},
          body.seasonId,
          body.episodeId,
        ),
        insertVideoFileStatement(filename, true),
        updateVideoFileStatement(false, draftRows[0].episodeDraftVideoFilename),
      ]);
      await transaction.commit();
    });
    return {
      videoState: VideoState.INCOMPLETE,
      resumableVideoUpload: {},
    };
  }
}
