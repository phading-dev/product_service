import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { getPrevEpisodes, getSeasonMetadata } from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { GetMoreEpisodesHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  GetMoreEpisodesRequestBody,
  GetMoreEpisodesResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class GetMoreEpisodesHandler extends GetMoreEpisodesHandlerInterface {
  public static create(): GetMoreEpisodesHandler {
    return new GetMoreEpisodesHandler(SPANNER_DATABASE, SERVICE_CLIENT);
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: GetMoreEpisodesRequestBody,
    sessionStr: string,
  ): Promise<GetMoreEpisodesResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.indexCursor) {
      throw newBadRequestError(`"indexCursor" is required.`);
    }
    let { userSession, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (!canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to get more episodes.`,
      );
    }
    let [metadataRows, episodes] = await Promise.all([
      getSeasonMetadata(this.database, body.seasonId, userSession.accountId),
      getPrevEpisodes(this.database, body.seasonId, body.indexCursor),
    ]);
    if (metadataRows.length === 0) {
      throw newNotFoundError(`Season ${body.seasonId} is not found.`);
    }
    return {
      episodes: episodes.map((e) => {
        return {
          episodeId: e.episodeEpisodeId,
          name: e.episodeName,
          index: e.episodeIndex,
          videoLength: e.episodeVideoLength,
          videoSize: e.episodeVideoSize,
          publishedTimestamp: e.episodePublishedTimestamp,
          premierTimestamp: e.episodePremierTimestamp,
        };
      }),
      indexCursor:
        episodes.length === 0
          ? body.indexCursor
          : episodes[episodes.length - 1].episodeIndex,
    };
  }
}
