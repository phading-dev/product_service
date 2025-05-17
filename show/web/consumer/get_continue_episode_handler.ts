import { NEXT_EPISODE_WATCH_TIME_THRESHOLD } from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getPublishedEpisode,
  listNextPublishedEpisodes,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { newGetLatestWatchedEpisodeRequest } from "@phading/play_activity_service_interface/show/node/client";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { GetContinueEpisodeHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import { Episode } from "@phading/product_service_interface/show/web/consumer/info";
import {
  GetContinueEpisodeRequestBody,
  GetContinueEpisodeResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class GetContinueEpisodeHandler extends GetContinueEpisodeHandlerInterface {
  public static create(): GetContinueEpisodeHandler {
    return new GetContinueEpisodeHandler(SPANNER_DATABASE, SERVICE_CLIENT);
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: GetContinueEpisodeRequestBody,
    sessionStr: string,
  ): Promise<GetContinueEpisodeResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
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
        `Account ${accountId} not allowed to get continue episode.`,
      );
    }
    let latestWatchedEpisode = await this.serviceClient.send(
      newGetLatestWatchedEpisodeRequest({
        watcherId: accountId,
        seasonId: body.seasonId,
      }),
    );
    if (!latestWatchedEpisode.episodeId) {
      return {
        episode: await this.getFirstEpisode(body.seasonId),
        rewatching: false,
      };
    } else {
      let latestEpisodeRows = await getPublishedEpisode(this.database, {
        episodeSeasonIdEq: body.seasonId,
        seasonStateEq: SeasonState.PUBLISHED,
        episodeEpisodeIdEq: latestWatchedEpisode.episodeId,
        episodeStateEq: EpisodeState.PUBLISHED,
      });
      if (latestEpisodeRows.length === 0) {
        return {
          episode: await this.getFirstEpisode(body.seasonId),
          rewatching: false,
        };
      }

      let latestEpisode = latestEpisodeRows[0];
      if (
        latestWatchedEpisode.watchedVideoTimeMs <
        latestEpisode.episodeVideoContainerCached.durationSec *
          1000 *
          NEXT_EPISODE_WATCH_TIME_THRESHOLD
      ) {
        return {
          episode: {
            episodeId: latestEpisode.episodeEpisodeId,
            name: latestEpisode.episodeName,
            index: latestEpisode.episodeIndex,
            videoDurationSec: latestEpisode.episodeVideoContainerCached.durationSec,
            resolution: latestEpisode.episodeVideoContainerCached.resolution,
            premiereTimeMs: latestEpisode.episodePremiereTimeMs,
          },
          rewatching: false,
        };
      }

      let nextEpisodeRows = await listNextPublishedEpisodes(this.database, {
        episodeSeasonIdEq: body.seasonId,
        seasonStateEq: SeasonState.PUBLISHED,
        episodeIndexGt: latestEpisode.episodeIndex,
        episodeStateEq: EpisodeState.PUBLISHED,
        limit: 1,
      });
      if (nextEpisodeRows.length === 0) {
        return {
          episode: await this.getFirstEpisode(body.seasonId),
          rewatching: true,
        };
      }

      let nextEpisode = nextEpisodeRows[0];
      return {
        episode: {
          episodeId: nextEpisode.episodeEpisodeId,
          name: nextEpisode.episodeName,
          index: nextEpisode.episodeIndex,
          videoDurationSec: nextEpisode.episodeVideoContainerCached.durationSec,
          resolution: nextEpisode.episodeVideoContainerCached.resolution,
          premiereTimeMs: nextEpisode.episodePremiereTimeMs,
        },
        rewatching: false,
      };
    }
  }

  private async getFirstEpisode(seasonId: string): Promise<Episode> {
    let firstEpisodeRows = await listNextPublishedEpisodes(this.database, {
      episodeSeasonIdEq: seasonId,
      seasonStateEq: SeasonState.PUBLISHED,
      episodeIndexGt: 0,
      episodeStateEq: EpisodeState.PUBLISHED,
      limit: 1,
    });
    if (firstEpisodeRows.length === 0) {
      throw newNotFoundError(`Season ${seasonId} doesn't have first episode.`);
    }
    let firstEpisode = firstEpisodeRows[0];
    return {
      episodeId: firstEpisode.episodeEpisodeId,
      name: firstEpisode.episodeName,
      index: firstEpisode.episodeIndex,
      videoDurationSec: firstEpisode.episodeVideoContainerCached.durationSec,
      resolution: firstEpisode.episodeVideoContainerCached.resolution,
      premiereTimeMs: firstEpisode.episodePremiereTimeMs,
    };
  }
}
