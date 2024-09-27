import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeason,
  getEpisodeDraftVideoFiles,
  getSeasonCoverImage,
  insertDeletingCoverImageFile,
  insertDeletingVideoFile,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { DeleteSeasonHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  DeleteSeasonRequestBody,
  DeleteSeasonResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class DeleteSeasonHandler extends DeleteSeasonHandlerInterface {
  public static create(): DeleteSeasonHandler {
    return new DeleteSeasonHandler(SPANNER_DATABASE, SERVICE_CLIENT);
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: DeleteSeasonRequestBody,
    sessionStr: string,
  ): Promise<DeleteSeasonResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    let { userSession, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to delete season.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let [coverImageRows, draftVideoFiles] = await Promise.all([
        getSeasonCoverImage((query) => transaction.run(query), body.seasonId),
        getEpisodeDraftVideoFiles(
          (query) => transaction.run(query),
          body.seasonId,
        ),
      ]);
      if (coverImageRows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      if (coverImageRows[0].seasonState !== SeasonState.DRAFT) {
        throw newBadRequestError(
          `Season ${body.seasonId} is not in DRAFT state and cannot be deleted anymore.`,
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
        deleteSeason((query) => transaction.run(query), body.seasonId),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
