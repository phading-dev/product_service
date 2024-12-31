import { VIDEO_PUBLIC_ACCESS_DOMAIN } from "../../../common/env_vars";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { getPublishedEpisodeForConsumer } from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { GetEpisodeDetailsHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  GetEpisodeDetailsRequestBody,
  GetEpisodeDetailsResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class GetEpisodeDetailsHandler extends GetEpisodeDetailsHandlerInterface {
  public static create(): GetEpisodeDetailsHandler {
    return new GetEpisodeDetailsHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      VIDEO_PUBLIC_ACCESS_DOMAIN,
      () => Date.now(),
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private videoPublicAccessDomain: string,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: GetEpisodeDetailsRequestBody,
    sessionStr: string,
  ): Promise<GetEpisodeDetailsResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.episodeId) {
      throw newBadRequestError(`"episodeId" is required.`);
    }
    let { accountId, canConsumeShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanConsumeShows: true,
      });
    if (!canConsumeShows) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to get episode details.`,
      );
    }
    let now = this.getNow();
    let rows = await getPublishedEpisodeForConsumer(
      this.database,
      body.seasonId,
      SeasonState.PUBLISHED,
      body.episodeId,
      now,
    );
    if (rows.length === 0) {
      throw newNotFoundError(`Season ${body.seasonId} episode ${body.episodeId} is not found.`);
    }
    let { eData } = rows[0];
    return {
      episodeDetails: {
        name: eData.name,
        index: eData.index,
        resolution: eData.videoContainer.resolution,
        videoDurationSec: eData.videoContainer.durationSec,
        premierTimeMs: eData.premierTimeMs,
        videoUrl:
          eData.premierTimeMs <= now
            ? `${this.videoPublicAccessDomain}/${eData.videoContainer.r2RootDirname}/${eData.videoContainer.r2MasterPlaylistFilename}`
            : undefined,
      },
    };
  }
}
