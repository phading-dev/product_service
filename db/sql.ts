import { ExecuteSqlRequest, RunResponse } from '@google-cloud/spanner/build/src/transaction';

export interface GetEpisodeAndSeasonRow {
  eVideoPath?: string,
  sSeasonId?: string,
  sName?: string,
  sDescription?: string,
  sCoverImagePath?: string,
  sPublisherId?: string,
  sgGrade?: number,
}

export async function getEpisodeAndSeason(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  eEpisodeId: string,
  sgStartTimestamp: number,
  sgEndTimestamp: number,
): Promise<Array<GetEpisodeAndSeasonRow>> {
  let [rows] = await run({
    sql: "SELECT e.videoPath, s.seasonId, s.name, s.description, s.coverImagePath, s.publisherId, sg.grade FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId INNER JOIN SeasonGrade AS sg ON s.seasonId = sg.seasonId WHERE (e.episodeId = @eEpisodeId AND (sg.startTimestamp >= @sgStartTimestamp AND sg.endTimestamp <= @sgEndTimestamp))",
    params: {
      eEpisodeId: eEpisodeId,
      sgStartTimestamp: new Date(sgStartTimestamp).toISOString(),
      sgEndTimestamp: new Date(sgEndTimestamp).toISOString(),
    },
    types: {
      eEpisodeId: { type: "string" },
      sgStartTimestamp: { type: "timestamp" },
      sgEndTimestamp: { type: "timestamp" },
    }
  });
  let resRows = new Array<GetEpisodeAndSeasonRow>();
  for (let row of rows) {
    resRows.push({
      eVideoPath: row.at(0).value == null ? undefined : row.at(0).value,
      sSeasonId: row.at(1).value == null ? undefined : row.at(1).value,
      sName: row.at(2).value == null ? undefined : row.at(2).value,
      sDescription: row.at(3).value == null ? undefined : row.at(3).value,
      sCoverImagePath: row.at(4).value == null ? undefined : row.at(4).value,
      sPublisherId: row.at(5).value == null ? undefined : row.at(5).value,
      sgGrade: row.at(6).value == null ? undefined : row.at(6).value.value,
    });
  }
  return resRows;
}

export interface GetAllEpisodesRow {
  esEpisodeId?: string,
  esName?: string,
  esVideoLength?: number,
  esScheduledPublishTimestamp?: number,
}

export async function getAllEpisodes(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  eEpisodeId: string,
  esScheduledPublishTimestamp: number,
): Promise<Array<GetAllEpisodesRow>> {
  let [rows] = await run({
    sql: "SELECT es.episodeId, es.name, es.videoLength, es.scheduledPublishTimestamp FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId INNER JOIN Episode AS es ON s.seasonId = es.seasonId WHERE (e.episodeId = @eEpisodeId AND es.scheduledPublishTimestamp <= @esScheduledPublishTimestamp) ORDER BY es.scheduledPublishTimestamp DESC",
    params: {
      eEpisodeId: eEpisodeId,
      esScheduledPublishTimestamp: new Date(esScheduledPublishTimestamp).toISOString(),
    },
    types: {
      eEpisodeId: { type: "string" },
      esScheduledPublishTimestamp: { type: "timestamp" },
    }
  });
  let resRows = new Array<GetAllEpisodesRow>();
  for (let row of rows) {
    resRows.push({
      esEpisodeId: row.at(0).value == null ? undefined : row.at(0).value,
      esName: row.at(1).value == null ? undefined : row.at(1).value,
      esVideoLength: row.at(2).value == null ? undefined : row.at(2).value.value,
      esScheduledPublishTimestamp: row.at(3).value == null ? undefined : row.at(3).value.getMicroseconds(),
    });
  }
  return resRows;
}
