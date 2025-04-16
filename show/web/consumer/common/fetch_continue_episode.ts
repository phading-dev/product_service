import { NEXT_EPISODE_WATCH_TIME_THRESHOLD } from "../../../../common/constants";
import {
  getPublishedEpisodeForConsumer,
  listNextPublishedEpisodesForConsumer,
} from "../../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { ContinueEpisode } from "@phading/product_service_interface/show/web/consumer/summary";

export async function fetchContinueEpisode(
  database: Database,
  seasonId: string,
  episodeId: string,
  episodeIndex: number,
  latestWatchedTimeMs: number,
): Promise<ContinueEpisode> {
  let latestEpisodeRowsPromise = getPublishedEpisodeForConsumer(database, {
    episodeSeasonIdEq: seasonId,
    seasonStateEq: SeasonState.PUBLISHED,
    episodeEpisodeIdEq: episodeId,
    episodeStateEq: EpisodeState.PUBLISHED,
  });
  let nextEpisodeRowsPromise = listNextPublishedEpisodesForConsumer(database, {
    episodeSeasonIdEq: seasonId,
    seasonStateEq: SeasonState.PUBLISHED,
    episodeIndexGt: episodeIndex,
    episodeStateEq: EpisodeState.PUBLISHED,
    limit: 1,
  });
  let latestEpisodeRows = await latestEpisodeRowsPromise;
  if (latestEpisodeRows.length === 0) {
    return undefined;
  }
  let latestEpisode = latestEpisodeRows[0];
  if (
    latestWatchedTimeMs <
    latestEpisode.episodeVideoContainer.durationSec *
      NEXT_EPISODE_WATCH_TIME_THRESHOLD
  ) {
    return {
      episode: {
        episodeId: latestEpisode.episodeEpisodeId,
        name: latestEpisode.episodeName,
        index: latestEpisode.episodeIndex,
        videoDurationSec: latestEpisode.episodeVideoContainer.durationSec,
        premiereTimeMs: latestEpisode.episodePremiereTimeMs,
      },
      continueTimeMs: latestWatchedTimeMs,
    };
  }
  let nextEpisodeRows = await nextEpisodeRowsPromise;
  if (nextEpisodeRows.length === 0) {
    return undefined;
  }
  let nextEpisode = nextEpisodeRows[0];
  return {
    episode: {
      episodeId: nextEpisode.episodeEpisodeId,
      name: nextEpisode.episodeName,
      index: nextEpisode.episodeIndex,
      videoDurationSec: nextEpisode.episodeVideoContainer.durationSec,
      premiereTimeMs: nextEpisode.episodePremiereTimeMs,
    },
    continueTimeMs: 0,
  };
}
