import { EPISODE_VIDEO_BUCKET } from "../../../common/cloud_storage";
import { VIODE_EXPIRATION_MS } from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { getEpisodeVideoFile } from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { Bucket } from "@google-cloud/storage";
import { GetVideoToPlayHandlerInterface } from "@phading/product_service_interface/consumer/show/frontend/handler";
import {
  GetVideoToPlayRequestBody,
  GetVideoToPlayResponse,
} from "@phading/product_service_interface/consumer/show/frontend/interface";
import { getContinueTimestampForEpisode } from "@phading/user_activity_service_interface/consumer/show/backend/client";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class GetVideoToPlayHandler extends GetVideoToPlayHandlerInterface {
  public static create(): GetVideoToPlayHandler {
    return new GetVideoToPlayHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      EPISODE_VIDEO_BUCKET,
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private bucket: Bucket,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: GetVideoToPlayRequestBody,
    sessionStr: string,
  ): Promise<GetVideoToPlayResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.episodeId) {
      throw newBadRequestError(`"episodeId" is required.`);
    }
    let { userSession, canConsumeShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanConsumeShows: true,
      });
    if (!canConsumeShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to get video.`,
      );
    }
    let [videoFileRows, continueTimestampResponse] = await Promise.all([
      getEpisodeVideoFile(
        (query) => this.database.run(query),
        body.seasonId,
        body.episodeId,
      ),
      getContinueTimestampForEpisode(this.serviceClient, {
        seasonId: body.seasonId,
        episodeId: body.episodeId,
      }),
    ]);
    if (videoFileRows.length === 0) {
      throw newNotFoundError(
        `Season ${body.seasonId} episode ${body.episodeId} not found.`,
      );
    }
    let signedUrlResponse = await this.bucket
      .file(videoFileRows[0].episodeVideoFilename)
      .getSignedUrl({
        action: "read",
        expires: VIODE_EXPIRATION_MS,
      });
    return {
      videoUrl: signedUrlResponse[0],
      continueTimestamp: continueTimestampResponse.continueTimestamp,
    };
  }
}
