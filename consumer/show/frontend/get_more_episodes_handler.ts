import {
  GetNextEpisodesForConsumerRow,
  GetPrevEpisodesForConsumerRow,
  getNextEpisodesForConsumer,
  getPrevEpisodesForConsumer,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { GetMoreEpisodesHandlerInterface } from "@phading/product_service_interface/consumer/show/frontend/handler";
import {
  GetMoreEpisodesRequestBody,
  GetMoreEpisodesResponse,
} from "@phading/product_service_interface/consumer/show/frontend/interface";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class GetMoreEpisodesHandler extends GetMoreEpisodesHandlerInterface {
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
    let { userSession, canConsumeShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanConsumeShows: true,
      });
    if (!canConsumeShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to get episodes.`,
      );
    }
    let rows: Array<
      GetNextEpisodesForConsumerRow | GetPrevEpisodesForConsumerRow
    >;
    if (body.next) {
      rows = await getNextEpisodesForConsumer(
        (query) => this.database.run(query),
        body.seasonId,
        body.indexCursor,
      );
    } else {
      rows = await getPrevEpisodesForConsumer(
        (query) => this.database.run(query),
        body.seasonId,
        body.indexCursor,
      );
    }
    return {
      episodes: rows.map((row) => {
        return {
          episodeId: row.episodeEpisodeId,
          name: row.episodeName,
          index: row.episodeIndex,
          videoLength: row.episodeVideoLength,
          upcomingPremierTime: row.episodePremierTimestamp,
        };
      }),
      indexCursor:
        rows.length === 0
          ? body.indexCursor
          : rows[rows.length - 1].episodeIndex,
    };
  }
}
