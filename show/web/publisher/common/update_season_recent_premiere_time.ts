import {
  deleteSeasonRecentPremiereTimeUpdatingTasksOfEpisodeStatement,
  insertSeasonRecentPremiereTimeUpdatingTaskStatement,
  listRecentEpisodesByPremiereTime,
  updateSeasonRecentPremiereTimeStatement,
} from "../../../../db/sql";
import { Transaction } from "@google-cloud/spanner";

export async function updateSeasonRecentPremiereTime(
  transaction: Transaction,
  seasonId: string,
  episodeId: string,
  now: number,
  premiereTimeMs?: number,
): Promise<void> {
  if (!premiereTimeMs || premiereTimeMs <= now) {
    let recentEpisodes = await listRecentEpisodesByPremiereTime(transaction, {
      episodeSeasonIdEq: seasonId,
      episodePremiereTimeMsLe: now,
      limit: 1,
    });
    await transaction.batchUpdate([
      deleteSeasonRecentPremiereTimeUpdatingTasksOfEpisodeStatement({
        seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: seasonId,
        seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: episodeId,
      }),
      updateSeasonRecentPremiereTimeStatement({
        seasonSeasonIdEq: seasonId,
        setRecentPremiereTimeMs:
          recentEpisodes.length > 0
            ? recentEpisodes[0].episodePremiereTimeMs
            : undefined,
      }),
    ]);
  } else {
    await transaction.batchUpdate([
      deleteSeasonRecentPremiereTimeUpdatingTasksOfEpisodeStatement({
        seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: seasonId,
        seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: episodeId,
      }),
      insertSeasonRecentPremiereTimeUpdatingTaskStatement({
        seasonId,
        episodeId,
        premiereTimeMs,
        retryCount: 0,
        executionTimeMs: premiereTimeMs,
        createdTimeMs: now,
      }),
    ]);
  }
}
