import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { updateEpisodeDraftResumableVideoUpload } from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { DeleteEpisodeVideoHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  DeleteEpisodeVideoRequestBody,
  DeleteEpisodeVideoResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { VideoState } from "@phading/product_service_interface/publisher/show/video_state";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class DeleteEpisodeVideoHandler extends DeleteEpisodeVideoHandlerInterface {
  public static create(): DeleteEpisodeVideoHandler {
    return new DeleteEpisodeVideoHandler(SPANNER_DATABASE, SERVICE_CLIENT);
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
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
    await updateEpisodeDraftResumableVideoUpload(
      (query) => this.database.run(query),
      VideoState.EMPTY,
      {},
      body.seasonId,
      body.episodeId,
    );
    return {};
  }
}
