import crypto = require("crypto");
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getSeasonMetadata,
  insertEpisodeDraftStatement,
  insertVideoFileStatement,
  updateSeasonLastChangeTimestampStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { CreateEpisodeDraftHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  CreateEpisodeDraftRequestBody,
  CreateEpisodeDraftResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { VideoState } from "@phading/product_service_interface/publisher/show/video_state";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class CreateEpisodeDraftHandler extends CreateEpisodeDraftHandlerInterface {
  public static create(): CreateEpisodeDraftHandler {
    return new CreateEpisodeDraftHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      () => Date.now(),
      () => crypto.randomUUID(),
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private getNow: () => number,
    private generateUuid: () => string,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: CreateEpisodeDraftRequestBody,
    sessionStr: string,
  ): Promise<CreateEpisodeDraftResponse> {
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
        `Account ${userSession.accountId} not allowed to create episode draft.`,
      );
    }
    let episodeId = this.generateUuid();
    let videoFilename = episodeId;
    await this.database.runTransactionAsync(async (transaction) => {
      let metadataRows = await getSeasonMetadata(
        transaction,
        body.seasonId,
        userSession.accountId,
      );
      if (metadataRows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      if (metadataRows[0].seasonState === SeasonState.ARCHIVED) {
        throw newBadRequestError(
          `Season ${body.seasonId} is archived and cannot create new episode.`,
        );
      }
      await transaction.batchUpdate([
        insertEpisodeDraftStatement(
          body.seasonId,
          episodeId,
          body.episodeName,
          videoFilename,
          VideoState.INCOMPLETE,
          {},
        ),
        insertVideoFileStatement(videoFilename, true),
        updateSeasonLastChangeTimestampStatement(this.getNow(), body.seasonId),
      ]);
      await transaction.commit();
    });
    return {
      draft: {
        episodeId,
        name: body.episodeName,
        videoState: VideoState.INCOMPLETE,
        resumableVideoUpload: {},
      },
    };
  }
}
