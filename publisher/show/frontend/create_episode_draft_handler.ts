import crypto = require("crypto");
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  insertEpisodeDraft,
  updateSeasonLastChangeTimestamp,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { CreateEpisodeDraftHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  CreateEpisodeDraftRequestBody,
  CreateEpisodeDraftResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { VideoState } from "@phading/product_service_interface/publisher/show/video_state";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class CreateEpisodeDraftHandler extends CreateEpisodeDraftHandlerInterface {
  public static create(): CreateEpisodeDraftHandler {
    return new CreateEpisodeDraftHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
    if (canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to create episode draft.`,
      );
    }
    let episodeId = this.generateUuid();
    let videoFilename = episodeId;
    await this.database.runTransactionAsync(async (transaction) => {
      await Promise.all([
        insertEpisodeDraft(
          (query) => transaction.run(query),
          body.seasonId,
          episodeId,
          body.episodeName,
          videoFilename,
          VideoState.EMPTY,
          {},
        ),
        updateSeasonLastChangeTimestamp(
          (query) => transaction.run(query),
          body.seasonId,
        ),
      ]);
    });
    return {
      draft: {
        episodeId,
        name: body.episodeName,
        videoState: VideoState.EMPTY,
        resumableVideoUpload: {},
      },
    };
  }
}
