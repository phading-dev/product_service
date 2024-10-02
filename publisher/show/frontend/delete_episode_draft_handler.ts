import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteEpisodeDraftStatement,
  getEpisodeDraft,
  getSeasonMetadata,
  updateSeasonLastChangeTimestampStatement,
  updateVideoFileStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { DeleteEpisodeDraftHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  DeleteEpisodeDraftRequestBody,
  DeleteEpisodeDraftResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class DeleteEpisodeDraftHandler extends DeleteEpisodeDraftHandlerInterface {
  public static create(): DeleteEpisodeDraftHandler {
    return new DeleteEpisodeDraftHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
    body: DeleteEpisodeDraftRequestBody,
    sessionStr: string,
  ): Promise<DeleteEpisodeDraftResponse> {
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
        `Account ${userSession.accountId} not allowed to delete episode draft.`,
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
      await transaction.batchUpdate([
        deleteEpisodeDraftStatement(body.seasonId, body.episodeId),
        updateVideoFileStatement(false, draftRows[0].episodeDraftVideoFilename),
        updateSeasonLastChangeTimestampStatement(this.getNow(), body.seasonId),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
