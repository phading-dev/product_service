import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { getPrevEpisodes } from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { GetMoreEpisodesHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  GetMoreEpisodesRequestBody,
  GetMoreEpisodesResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
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
    if (canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to get more episodes.`,
      );
    }
    let rows = await getPrevEpisodes(
      (query) => this.database.run(query),
      body.seasonId,
      body.indexCursor,
    );
    return {
      episodes: rows.map((row) => {
        return {
          episodeId: row.episodeEpisodeId,
          name: row.episodeName,
          index: row.episodeIndex,
          videoLength: row.episodeVideoLength,
          videoSize: row.episodeVideoSize,
          publishedTimestamps: row.episodePublishedTimestamp,
          premierTimestamp: row.episodePremierTimestamp,
        };
      }),
      indexCursor:
        rows.length === 0
          ? body.indexCursor
          : rows[rows.length - 1].episodeIndex,
    };
  }
}
