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
  let latestEpisodeRowsPromise = getPublishedEpisodeForConsumer(
    database,
    seasonId,
    SeasonState.PUBLISHED,
    episodeId,
    now,
  );
  let nextEpisodeRowsPromise = listNextPublishedEpisodesForConsumer(
    database,
    seasonId,
    SeasonState.PUBLISHED,
    episodeIndex,
    now,
    1,
  );
  let latestEpisodeRows = await latestEpisodeRowsPromise;
  if (latestEpisodeRows.length === 0) {
    return undefined;
  }
  let latestEpisode = latestEpisodeRows[0].eData;
  if (
    latestWatchedTimeMs <
    latestEpisode.videoContainer.durationSec * NEXT_EPISODE_WATCH_TIME_THRESHOLD
  ) {
    return {
      episodeId: latestEpisode.episodeId,
      name: latestEpisode.name,
      index: latestEpisode.index,
      videoDurationSec: latestEpisode.videoContainer.durationSec,
      premierTimeMs: latestEpisode.premierTimeMs,
      continueTimeMs: latestWatchedTimeMs,
    };
  }
  let nextEpisodeRows = await nextEpisodeRowsPromise;
  if (nextEpisodeRows.length === 0) {
    return undefined;
  }
  let nextEpisode = nextEpisodeRows[0].eData;
  return {
    episodeId: nextEpisode.episodeId,
    name: nextEpisode.name,
    index: nextEpisode.index,
    videoDurationSec: nextEpisode.videoContainer.durationSec,
    premierTimeMs: nextEpisode.premierTimeMs,
    continueTimeMs: 0,
  };
}
