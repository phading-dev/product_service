import { NEXT_EPISODE_WATCH_TIME_THRESHOLD } from "../../../../common/constants";
import {
  getPublishedEpisodeForConsumer,
  listNextPublishedEpisodesForConsumer,
} from "../../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { EpisodeSummary } from "@phading/product_service_interface/show/web/consumer/episode_summary";

export async function fetchContinueEpisode(
  database: Database,
  seasonId: string,
  episodeId: string,
  episodeIndex: number,
  latestWatchedTimeMs: number,
  now: number,
): Promise<EpisodeSummary> {
  let latestEpisodeRowsPromise = getPublishedEpisodeForConsumer(database, {
    episodeSeasonIdEq: seasonId,
    seasonStateEq: SeasonState.PUBLISHED,
    episodeEpisodeIdEq: episodeId,
    episodePublishTimeMsLt: now,
  });
  let nextEpisodeRowsPromise = listNextPublishedEpisodesForConsumer(database, {
    episodeSeasonIdEq: seasonId,
    seasonStateEq: SeasonState.PUBLISHED,
    episodeIndexGt: episodeIndex,
    episodePublishTimeMsLt: now,
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
      episodeId: latestEpisode.episodeEpisodeId,
      name: latestEpisode.episodeName,
      index: latestEpisode.episodeIndex,
      videoDurationSec: latestEpisode.episodeVideoContainer.durationSec,
      premierTimeMs: latestEpisode.episodePremierTimeMs,
      continueTimeMs: latestWatchedTimeMs,
    };
  }
  let nextEpisodeRows = await nextEpisodeRowsPromise;
  if (nextEpisodeRows.length === 0) {
    return undefined;
  }
  let nextEpisode = nextEpisodeRows[0];
  return {
    episodeId: nextEpisode.episodeEpisodeId,
    name: nextEpisode.episodeName,
    index: nextEpisode.episodeIndex,
    videoDurationSec: nextEpisode.episodeVideoContainer.durationSec,
    premierTimeMs: nextEpisode.episodePremierTimeMs,
    continueTimeMs: 0,
  };
}
