import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  ListNextPublishedEpisodesForConsumerRow,
  ListPrevPublishedEpisodesForConsumerRow,
  listNextPublishedEpisodesForConsumer,
  listPrevPublishedEpisodesForConsumer,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { MAX_NUM_OF_EPISODES_PER_SEASON } from "@phading/constants/show";
import { newGetLatestWatchedTimeOfEpisodeRequest } from "@phading/play_activity_service_interface/show/node/client";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { EpisodeSummary } from "@phading/product_service_interface/show/web/consumer/episode_summary";
import { ListEpisodesHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  ListEpisodesRequestBody,
  ListEpisodesResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class ListEpisodesHandler extends ListEpisodesHandlerInterface {
  public static create(): ListEpisodesHandler {
    return new ListEpisodesHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
    body: ListEpisodesRequestBody,
    sessionStr: string,
  ): Promise<ListEpisodesResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.limit) {
      throw newBadRequestError(`"limit" is required.`);
    }
    let { accountId, capabilities } = await this.serviceClient.send(
      newFetchSessionAndCheckCapabilityRequest({
        signedSession: sessionStr,
        capabilitiesMask: {
          checkCanConsume: true,
        },
      }),
    );
    if (!capabilities.canConsume) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to list episodes.`,
      );
    }
    let rows: Array<
      | ListNextPublishedEpisodesForConsumerRow
      | ListPrevPublishedEpisodesForConsumerRow
    >;
    if (body.next) {
      rows = await listNextPublishedEpisodesForConsumer(this.database, {
        episodeSeasonIdEq: body.seasonId,
        seasonStateEq: SeasonState.PUBLISHED,
        episodeIndexGt: body.indexCursor ?? 0,
        episodePublishTimeMsLt: this.getNow(),
        limit: body.limit,
      });
    } else {
      rows = await listPrevPublishedEpisodesForConsumer(this.database, {
        episodeSeasonIdEq: body.seasonId,
        seasonStateEq: SeasonState.PUBLISHED,
        episodeIndexLt: body.indexCursor ?? MAX_NUM_OF_EPISODES_PER_SEASON + 1,
        episodePublishTimeMsLt: this.getNow(),
        limit: body.limit,
      });
    }
    let episodes = new Array<EpisodeSummary>();
    await Promise.all(
      rows.map(async (row, i) => {
        let response = await this.serviceClient.send(
          newGetLatestWatchedTimeOfEpisodeRequest({
            watcherId: accountId,
            seasonId: row.episodeSeasonId,
            episodeId: row.episodeEpisodeId,
          }),
        );
        episodes[i] = {
          episodeId: row.episodeEpisodeId,
          index: row.episodeIndex,
          name: row.episodeName,
          videoDurationSec: row.episodeVideoContainer.durationSec,
          premierTimeMs: row.episodePremierTimeMs,
          continueTimeMs: response.watchedTimeMs,
        };
      }),
    );
    return {
      episodes,
      indexCursor:
        rows.length < body.limit ? undefined : rows[rows.length - 1].episodeIndex,
    };
  }
}
