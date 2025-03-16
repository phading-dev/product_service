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
    eSeasonIdEq: seasonId,
    sStateEq: SeasonState.PUBLISHED,
    eEpisodeIdEq: episodeId,
    ePublishTimeMsLt: now,
  });
  let nextEpisodeRowsPromise = listNextPublishedEpisodesForConsumer(database, {
    eSeasonIdEq: seasonId,
    sStateEq: SeasonState.PUBLISHED,
    eIndexGt: episodeIndex,
    ePublishTimeMsLt: now,
    limit: 1,
  });
  let latestEpisodeRows = await latestEpisodeRowsPromise;
  if (latestEpisodeRows.length === 0) {
    return undefined;
  }
  let latestEpisode = latestEpisodeRows[0];
  if (
    latestWatchedTimeMs <
    latestEpisode.eVideoContainer.durationSec *
      NEXT_EPISODE_WATCH_TIME_THRESHOLD
  ) {
    return {
      episodeId: latestEpisode.eEpisodeId,
      name: latestEpisode.eName,
      index: latestEpisode.eIndex,
      videoDurationSec: latestEpisode.eVideoContainer.durationSec,
      premierTimeMs: latestEpisode.ePremierTimeMs,
      continueTimeMs: latestWatchedTimeMs,
    };
  }
  let nextEpisodeRows = await nextEpisodeRowsPromise;
  if (nextEpisodeRows.length === 0) {
    return undefined;
  }
  let nextEpisode = nextEpisodeRows[0];
  return {
    episodeId: nextEpisode.eEpisodeId,
    name: nextEpisode.eName,
    index: nextEpisode.eIndex,
    videoDurationSec: nextEpisode.eVideoContainer.durationSec,
    premierTimeMs: nextEpisode.ePremierTimeMs,
    continueTimeMs: 0,
  };
}
