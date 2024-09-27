import { SeasonState, SEASON_STATE } from '@phading/product_service_interface/publisher/show/season_state';
import { Spanner } from '@google-cloud/spanner';
import { ExecuteSqlRequest, RunResponse } from '@google-cloud/spanner/build/src/transaction';
import { toEnumFromNumber, deserializeMessage, serializeMessage } from '@selfage/message/serializer';
import { ResumableVideoUpload, RESUMABLE_VIDEO_UPLOAD } from '@phading/product_service_interface/publisher/show/resumable_video_upload';
import { VideoState, VIDEO_STATE } from '@phading/product_service_interface/publisher/show/video_state';

export interface GetSeasonForConsumerRow {
  sSeasonId?: string,
  sName?: string,
  sDescription?: string,
  sCoverImageFilename?: string,
  sTotalEpisodes?: number,
  sgGrade?: number,
}

export async function getSeasonForConsumer(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  sSeasonIdEq: string,
  sStateEq: SeasonState,
  sgStartTimestampLe: number,
  sgEndTimestampGe: number,
): Promise<Array<GetSeasonForConsumerRow>> {
  let [rows] = await run({
    sql: "SELECT s.seasonId, s.name, s.description, s.coverImageFilename, s.totalEpisodes, sg.grade FROM Season AS s INNER JOIN SeasonGrade AS sg ON s.seasonId = sg.seasonId WHERE (s.seasonId = @sSeasonIdEq AND s.state = @sStateEq AND sg.startTimestamp <= @sgStartTimestampLe AND sg.endTimestamp >= @sgEndTimestampGe)",
    params: {
      sSeasonIdEq: sSeasonIdEq,
      sStateEq: Spanner.float(sStateEq),
      sgStartTimestampLe: new Date(sgStartTimestampLe).toISOString(),
      sgEndTimestampGe: new Date(sgEndTimestampGe).toISOString(),
    },
    types: {
      sSeasonIdEq: { type: "string" },
      sStateEq: { type: "float64" },
      sgStartTimestampLe: { type: "timestamp" },
      sgEndTimestampGe: { type: "timestamp" },
    }
  });
  let resRows = new Array<GetSeasonForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      sSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      sName: row.at(1).value == null ? undefined : row.at(1).value,
      sDescription: row.at(2).value == null ? undefined : row.at(2).value,
      sCoverImageFilename: row.at(3).value == null ? undefined : row.at(3).value,
      sTotalEpisodes: row.at(4).value == null ? undefined : row.at(4).value.value,
      sgGrade: row.at(5).value == null ? undefined : row.at(5).value.value,
    });
  }
  return resRows;
}

export interface GetSeasonDetailsRow {
  seasonName?: string,
  seasonDescription?: string,
  seasonCoverImageFilename?: string,
  seasonCreatedTimestamp?: number,
  seasonLastChangeTimestamp?: number,
  seasonState?: SeasonState,
  seasonTotalEpisodes?: number,
}

export async function getSeasonDetails(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  seasonSeasonIdEq: string,
): Promise<Array<GetSeasonDetailsRow>> {
  let [rows] = await run({
    sql: "SELECT Season.name, Season.description, Season.coverImageFilename, Season.createdTimestamp, Season.lastChangeTimestamp, Season.state, Season.totalEpisodes FROM Season WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: seasonSeasonIdEq,
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonDetailsRow>();
  for (let row of rows) {
    resRows.push({
      seasonName: row.at(0).value == null ? undefined : row.at(0).value,
      seasonDescription: row.at(1).value == null ? undefined : row.at(1).value,
      seasonCoverImageFilename: row.at(2).value == null ? undefined : row.at(2).value,
      seasonCreatedTimestamp: row.at(3).value == null ? undefined : row.at(3).value.getMicroseconds(),
      seasonLastChangeTimestamp: row.at(4).value == null ? undefined : row.at(4).value.getMicroseconds(),
      seasonState: row.at(5).value == null ? undefined : toEnumFromNumber(row.at(5).value.value, SEASON_STATE),
      seasonTotalEpisodes: row.at(6).value == null ? undefined : row.at(6).value.value,
    });
  }
  return resRows;
}

export interface GetSeasonTotalEpisodesRow {
  seasonTotalEpisodes?: number,
  seasonState?: SeasonState,
}

export async function getSeasonTotalEpisodes(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  seasonSeasonIdEq: string,
): Promise<Array<GetSeasonTotalEpisodesRow>> {
  let [rows] = await run({
    sql: "SELECT Season.totalEpisodes, Season.state FROM Season WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: seasonSeasonIdEq,
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonTotalEpisodesRow>();
  for (let row of rows) {
    resRows.push({
      seasonTotalEpisodes: row.at(0).value == null ? undefined : row.at(0).value.value,
      seasonState: row.at(1).value == null ? undefined : toEnumFromNumber(row.at(1).value.value, SEASON_STATE),
    });
  }
  return resRows;
}

export interface GetSeasonCoverImageRow {
  seasonCoverImageFilename?: string,
  seasonState?: SeasonState,
}

export async function getSeasonCoverImage(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  seasonSeasonIdEq: string,
): Promise<Array<GetSeasonCoverImageRow>> {
  let [rows] = await run({
    sql: "SELECT Season.coverImageFilename, Season.state FROM Season WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: seasonSeasonIdEq,
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonCoverImageRow>();
  for (let row of rows) {
    resRows.push({
      seasonCoverImageFilename: row.at(0).value == null ? undefined : row.at(0).value,
      seasonState: row.at(1).value == null ? undefined : toEnumFromNumber(row.at(1).value.value, SEASON_STATE),
    });
  }
  return resRows;
}

export interface GetSeasonStateRow {
  seasonState?: SeasonState,
}

export async function getSeasonState(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  seasonSeasonIdEq: string,
): Promise<Array<GetSeasonStateRow>> {
  let [rows] = await run({
    sql: "SELECT Season.state FROM Season WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: seasonSeasonIdEq,
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonStateRow>();
  for (let row of rows) {
    resRows.push({
      seasonState: row.at(0).value == null ? undefined : toEnumFromNumber(row.at(0).value.value, SEASON_STATE),
    });
  }
  return resRows;
}

export interface GetLastSeasonsRow {
  seasonSeasonId?: string,
  seasonName?: string,
  seasonCoverImageFilename?: string,
  seasonState?: SeasonState,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimestamp?: number,
}

export async function getLastSeasons(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  seasonStateEq: SeasonState,
): Promise<Array<GetLastSeasonsRow>> {
  let [rows] = await run({
    sql: "SELECT Season.seasonId, Season.name, Season.coverImageFilename, Season.state, Season.totalEpisodes, Season.lastChangeTimestamp FROM Season WHERE Season.state = @seasonStateEq ORDER BY Season.lastChangeTimestamp DESC LIMIT 20",
    params: {
      seasonStateEq: Spanner.float(seasonStateEq),
    },
    types: {
      seasonStateEq: { type: "float64" },
    }
  });
  let resRows = new Array<GetLastSeasonsRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonName: row.at(1).value == null ? undefined : row.at(1).value,
      seasonCoverImageFilename: row.at(2).value == null ? undefined : row.at(2).value,
      seasonState: row.at(3).value == null ? undefined : toEnumFromNumber(row.at(3).value.value, SEASON_STATE),
      seasonTotalEpisodes: row.at(4).value == null ? undefined : row.at(4).value.value,
      seasonLastChangeTimestamp: row.at(5).value == null ? undefined : row.at(5).value.getMicroseconds(),
    });
  }
  return resRows;
}

export interface GetMoreSeasonsRow {
  seasonSeasonId?: string,
  seasonName?: string,
  seasonCoverImageFilename?: string,
  seasonState?: SeasonState,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimestamp?: number,
}

export async function getMoreSeasons(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  seasonLastChangeTimestampLt: number,
  seasonStateEq: SeasonState,
): Promise<Array<GetMoreSeasonsRow>> {
  let [rows] = await run({
    sql: "SELECT Season.seasonId, Season.name, Season.coverImageFilename, Season.state, Season.totalEpisodes, Season.lastChangeTimestamp FROM Season WHERE (Season.lastChangeTimestamp < @seasonLastChangeTimestampLt AND Season.state = @seasonStateEq) ORDER BY Season.lastChangeTimestamp DESC LIMIT 20",
    params: {
      seasonLastChangeTimestampLt: new Date(seasonLastChangeTimestampLt).toISOString(),
      seasonStateEq: Spanner.float(seasonStateEq),
    },
    types: {
      seasonLastChangeTimestampLt: { type: "timestamp" },
      seasonStateEq: { type: "float64" },
    }
  });
  let resRows = new Array<GetMoreSeasonsRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonName: row.at(1).value == null ? undefined : row.at(1).value,
      seasonCoverImageFilename: row.at(2).value == null ? undefined : row.at(2).value,
      seasonState: row.at(3).value == null ? undefined : toEnumFromNumber(row.at(3).value.value, SEASON_STATE),
      seasonTotalEpisodes: row.at(4).value == null ? undefined : row.at(4).value.value,
      seasonLastChangeTimestamp: row.at(5).value == null ? undefined : row.at(5).value.getMicroseconds(),
    });
  }
  return resRows;
}

export interface GetLastTwoSeasonGradeRow {
  sgGrade?: number,
  sgStartTimestamp?: number,
  sgEndTimestamp?: number,
}

export async function getLastTwoSeasonGrade(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  sSeasonIdEq: string,
  sgEndTimestampGe: number,
): Promise<Array<GetLastTwoSeasonGradeRow>> {
  let [rows] = await run({
    sql: "SELECT sg.grade, sg.startTimestamp, sg.endTimestamp FROM Season AS s INNER JOIN SeasonGrade AS sg ON s.seasonId = sg.seasonId WHERE (s.seasonId = @sSeasonIdEq AND sg.endTimestamp >= @sgEndTimestampGe) ORDER BY sg.endTimestamp DESC LIMIT 2",
    params: {
      sSeasonIdEq: sSeasonIdEq,
      sgEndTimestampGe: new Date(sgEndTimestampGe).toISOString(),
    },
    types: {
      sSeasonIdEq: { type: "string" },
      sgEndTimestampGe: { type: "timestamp" },
    }
  });
  let resRows = new Array<GetLastTwoSeasonGradeRow>();
  for (let row of rows) {
    resRows.push({
      sgGrade: row.at(0).value == null ? undefined : row.at(0).value.value,
      sgStartTimestamp: row.at(1).value == null ? undefined : row.at(1).value.getMicroseconds(),
      sgEndTimestamp: row.at(2).value == null ? undefined : row.at(2).value.getMicroseconds(),
    });
  }
  return resRows;
}

export interface GetEpisodeDraftsRow {
  episodeDraftEpisodeId?: string,
  episodeDraftName?: string,
  episodeDraftVideoFilename?: string,
  episodeDraftResumableVideoUpload?: ResumableVideoUpload,
  episodeDraftVideoState?: VideoState,
  episodeDraftVideoUploadedTimestamp?: number,
  episodeDraftVideoLength?: number,
  episodeDraftVideoSize?: number,
}

export async function getEpisodeDrafts(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  episodeDraftSeasonIdEq: string,
): Promise<Array<GetEpisodeDraftsRow>> {
  let [rows] = await run({
    sql: "SELECT EpisodeDraft.episodeId, EpisodeDraft.name, EpisodeDraft.videoFilename, EpisodeDraft.resumableVideoUpload, EpisodeDraft.videoState, EpisodeDraft.videoUploadedTimestamp, EpisodeDraft.videoLength, EpisodeDraft.videoSize FROM EpisodeDraft WHERE EpisodeDraft.seasonId = @episodeDraftSeasonIdEq ORDER BY EpisodeDraft.videoUploadedTimestamp DESC",
    params: {
      episodeDraftSeasonIdEq: episodeDraftSeasonIdEq,
    },
    types: {
      episodeDraftSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetEpisodeDraftsRow>();
  for (let row of rows) {
    resRows.push({
      episodeDraftEpisodeId: row.at(0).value == null ? undefined : row.at(0).value,
      episodeDraftName: row.at(1).value == null ? undefined : row.at(1).value,
      episodeDraftVideoFilename: row.at(2).value == null ? undefined : row.at(2).value,
      episodeDraftResumableVideoUpload: row.at(3).value == null ? undefined : deserializeMessage(row.at(3).value, RESUMABLE_VIDEO_UPLOAD),
      episodeDraftVideoState: row.at(4).value == null ? undefined : toEnumFromNumber(row.at(4).value.value, VIDEO_STATE),
      episodeDraftVideoUploadedTimestamp: row.at(5).value == null ? undefined : row.at(5).value.getMicroseconds(),
      episodeDraftVideoLength: row.at(6).value == null ? undefined : row.at(6).value.value,
      episodeDraftVideoSize: row.at(7).value == null ? undefined : row.at(7).value.value,
    });
  }
  return resRows;
}

export interface GetEpisodeDraftRow {
  episodeDraftName?: string,
  episodeDraftVideoFilename?: string,
  episodeDraftResumableVideoUpload?: ResumableVideoUpload,
  episodeDraftVideoState?: VideoState,
  episodeDraftVideoUploadedTimestamp?: number,
  episodeDraftVideoLength?: number,
  episodeDraftVideoSize?: number,
}

export async function getEpisodeDraft(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  episodeDraftSeasonIdEq: string,
  episodeDraftEpisodeIdEq: string,
): Promise<Array<GetEpisodeDraftRow>> {
  let [rows] = await run({
    sql: "SELECT EpisodeDraft.name, EpisodeDraft.videoFilename, EpisodeDraft.resumableVideoUpload, EpisodeDraft.videoState, EpisodeDraft.videoUploadedTimestamp, EpisodeDraft.videoLength, EpisodeDraft.videoSize FROM EpisodeDraft WHERE (EpisodeDraft.seasonId = @episodeDraftSeasonIdEq AND EpisodeDraft.episodeId = @episodeDraftEpisodeIdEq)",
    params: {
      episodeDraftSeasonIdEq: episodeDraftSeasonIdEq,
      episodeDraftEpisodeIdEq: episodeDraftEpisodeIdEq,
    },
    types: {
      episodeDraftSeasonIdEq: { type: "string" },
      episodeDraftEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetEpisodeDraftRow>();
  for (let row of rows) {
    resRows.push({
      episodeDraftName: row.at(0).value == null ? undefined : row.at(0).value,
      episodeDraftVideoFilename: row.at(1).value == null ? undefined : row.at(1).value,
      episodeDraftResumableVideoUpload: row.at(2).value == null ? undefined : deserializeMessage(row.at(2).value, RESUMABLE_VIDEO_UPLOAD),
      episodeDraftVideoState: row.at(3).value == null ? undefined : toEnumFromNumber(row.at(3).value.value, VIDEO_STATE),
      episodeDraftVideoUploadedTimestamp: row.at(4).value == null ? undefined : row.at(4).value.getMicroseconds(),
      episodeDraftVideoLength: row.at(5).value == null ? undefined : row.at(5).value.value,
      episodeDraftVideoSize: row.at(6).value == null ? undefined : row.at(6).value.value,
    });
  }
  return resRows;
}

export interface GetEpisodeDraftVideoFilesRow {
  episodeDraftVideoFilename?: string,
}

export async function getEpisodeDraftVideoFiles(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  episodeDraftSeasonIdEq: string,
): Promise<Array<GetEpisodeDraftVideoFilesRow>> {
  let [rows] = await run({
    sql: "SELECT EpisodeDraft.videoFilename FROM EpisodeDraft WHERE EpisodeDraft.seasonId = @episodeDraftSeasonIdEq",
    params: {
      episodeDraftSeasonIdEq: episodeDraftSeasonIdEq,
    },
    types: {
      episodeDraftSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetEpisodeDraftVideoFilesRow>();
  for (let row of rows) {
    resRows.push({
      episodeDraftVideoFilename: row.at(0).value == null ? undefined : row.at(0).value,
    });
  }
  return resRows;
}

export interface GetEpisodeDraftVideoFileRow {
  episodeDraftVideoFilename?: string,
}

export async function getEpisodeDraftVideoFile(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  episodeDraftSeasonIdEq: string,
  episodeDraftEpisodeIdEq: string,
): Promise<Array<GetEpisodeDraftVideoFileRow>> {
  let [rows] = await run({
    sql: "SELECT EpisodeDraft.videoFilename FROM EpisodeDraft WHERE (EpisodeDraft.seasonId = @episodeDraftSeasonIdEq AND EpisodeDraft.episodeId = @episodeDraftEpisodeIdEq)",
    params: {
      episodeDraftSeasonIdEq: episodeDraftSeasonIdEq,
      episodeDraftEpisodeIdEq: episodeDraftEpisodeIdEq,
    },
    types: {
      episodeDraftSeasonIdEq: { type: "string" },
      episodeDraftEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetEpisodeDraftVideoFileRow>();
  for (let row of rows) {
    resRows.push({
      episodeDraftVideoFilename: row.at(0).value == null ? undefined : row.at(0).value,
    });
  }
  return resRows;
}

export interface GetEpisodeForConsumerRow {
  episodeName?: string,
  episodeIndex?: number,
  episodeVideoLength?: number,
  episodePremierTimestamp?: number,
}

export async function getEpisodeForConsumer(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  episodeSeasonIdEq: string,
  episodeEpisodeIdEq: string,
): Promise<Array<GetEpisodeForConsumerRow>> {
  let [rows] = await run({
    sql: "SELECT Episode.name, Episode.index, Episode.videoLength, Episode.premierTimestamp FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
      episodeEpisodeIdEq: episodeEpisodeIdEq,
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetEpisodeForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      episodeName: row.at(0).value == null ? undefined : row.at(0).value,
      episodeIndex: row.at(1).value == null ? undefined : row.at(1).value.value,
      episodeVideoLength: row.at(2).value == null ? undefined : row.at(2).value.value,
      episodePremierTimestamp: row.at(3).value == null ? undefined : row.at(3).value.getMicroseconds(),
    });
  }
  return resRows;
}

export interface GetEpisodeForConsumerByIndexRow {
  episodeEpisodeId?: string,
  episodeName?: string,
  episodeVideoLength?: number,
  episodePremierTimestamp?: number,
}

export async function getEpisodeForConsumerByIndex(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  episodeSeasonIdEq: string,
  episodeIndexEq: number,
): Promise<Array<GetEpisodeForConsumerByIndexRow>> {
  let [rows] = await run({
    sql: "SELECT Episode.episodeId, Episode.name, Episode.videoLength, Episode.premierTimestamp FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.index = @episodeIndexEq)",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
      episodeIndexEq: Spanner.float(episodeIndexEq),
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeIndexEq: { type: "float64" },
    }
  });
  let resRows = new Array<GetEpisodeForConsumerByIndexRow>();
  for (let row of rows) {
    resRows.push({
      episodeEpisodeId: row.at(0).value == null ? undefined : row.at(0).value,
      episodeName: row.at(1).value == null ? undefined : row.at(1).value,
      episodeVideoLength: row.at(2).value == null ? undefined : row.at(2).value.value,
      episodePremierTimestamp: row.at(3).value == null ? undefined : row.at(3).value.getMicroseconds(),
    });
  }
  return resRows;
}

export interface GetNextEpisodesForConsumerRow {
  episodeEpisodeId?: string,
  episodeName?: string,
  episodeIndex?: number,
  episodeVideoLength?: number,
  episodePremierTimestamp?: number,
}

export async function getNextEpisodesForConsumer(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  episodeSeasonIdEq: string,
  episodeIndexLt: number,
): Promise<Array<GetNextEpisodesForConsumerRow>> {
  let [rows] = await run({
    sql: "SELECT Episode.episodeId, Episode.name, Episode.index, Episode.videoLength, Episode.premierTimestamp FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.index < @episodeIndexLt) ORDER BY Episode.index LIMIT 20",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
      episodeIndexLt: Spanner.float(episodeIndexLt),
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeIndexLt: { type: "float64" },
    }
  });
  let resRows = new Array<GetNextEpisodesForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      episodeEpisodeId: row.at(0).value == null ? undefined : row.at(0).value,
      episodeName: row.at(1).value == null ? undefined : row.at(1).value,
      episodeIndex: row.at(2).value == null ? undefined : row.at(2).value.value,
      episodeVideoLength: row.at(3).value == null ? undefined : row.at(3).value.value,
      episodePremierTimestamp: row.at(4).value == null ? undefined : row.at(4).value.getMicroseconds(),
    });
  }
  return resRows;
}

export interface GetPrevEpisodesForConsumerRow {
  episodeEpisodeId?: string,
  episodeName?: string,
  episodeIndex?: number,
  episodeVideoLength?: number,
  episodePremierTimestamp?: number,
}

export async function getPrevEpisodesForConsumer(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  episodeSeasonIdEq: string,
  episodeIndexGt: number,
): Promise<Array<GetPrevEpisodesForConsumerRow>> {
  let [rows] = await run({
    sql: "SELECT Episode.episodeId, Episode.name, Episode.index, Episode.videoLength, Episode.premierTimestamp FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.index > @episodeIndexGt) ORDER BY Episode.index DESC LIMIT 20",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
      episodeIndexGt: Spanner.float(episodeIndexGt),
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeIndexGt: { type: "float64" },
    }
  });
  let resRows = new Array<GetPrevEpisodesForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      episodeEpisodeId: row.at(0).value == null ? undefined : row.at(0).value,
      episodeName: row.at(1).value == null ? undefined : row.at(1).value,
      episodeIndex: row.at(2).value == null ? undefined : row.at(2).value.value,
      episodeVideoLength: row.at(3).value == null ? undefined : row.at(3).value.value,
      episodePremierTimestamp: row.at(4).value == null ? undefined : row.at(4).value.getMicroseconds(),
    });
  }
  return resRows;
}

export interface GetLastEpisodesRow {
  episodeEpisodeId?: string,
  episodeName?: string,
  episodeIndex?: number,
  episodeVideoLength?: number,
  episodeVideoSize?: number,
  episodePublishedTimestamp?: number,
  episodePremierTimestamp?: number,
}

export async function getLastEpisodes(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  episodeSeasonIdEq: string,
): Promise<Array<GetLastEpisodesRow>> {
  let [rows] = await run({
    sql: "SELECT Episode.episodeId, Episode.name, Episode.index, Episode.videoLength, Episode.videoSize, Episode.publishedTimestamp, Episode.premierTimestamp FROM Episode WHERE Episode.seasonId = @episodeSeasonIdEq ORDER BY Episode.index DESC LIMIT 20",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetLastEpisodesRow>();
  for (let row of rows) {
    resRows.push({
      episodeEpisodeId: row.at(0).value == null ? undefined : row.at(0).value,
      episodeName: row.at(1).value == null ? undefined : row.at(1).value,
      episodeIndex: row.at(2).value == null ? undefined : row.at(2).value.value,
      episodeVideoLength: row.at(3).value == null ? undefined : row.at(3).value.value,
      episodeVideoSize: row.at(4).value == null ? undefined : row.at(4).value.value,
      episodePublishedTimestamp: row.at(5).value == null ? undefined : row.at(5).value.getMicroseconds(),
      episodePremierTimestamp: row.at(6).value == null ? undefined : row.at(6).value.getMicroseconds(),
    });
  }
  return resRows;
}

export interface GetPrevEpisodesRow {
  episodeEpisodeId?: string,
  episodeName?: string,
  episodeIndex?: number,
  episodeVideoLength?: number,
  episodeVideoSize?: number,
  episodePublishedTimestamp?: number,
  episodePremierTimestamp?: number,
}

export async function getPrevEpisodes(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  episodeSeasonIdEq: string,
  episodeIndexLt: number,
): Promise<Array<GetPrevEpisodesRow>> {
  let [rows] = await run({
    sql: "SELECT Episode.episodeId, Episode.name, Episode.index, Episode.videoLength, Episode.videoSize, Episode.publishedTimestamp, Episode.premierTimestamp FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.index < @episodeIndexLt) ORDER BY Episode.index DESC LIMIT 20",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
      episodeIndexLt: Spanner.float(episodeIndexLt),
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeIndexLt: { type: "float64" },
    }
  });
  let resRows = new Array<GetPrevEpisodesRow>();
  for (let row of rows) {
    resRows.push({
      episodeEpisodeId: row.at(0).value == null ? undefined : row.at(0).value,
      episodeName: row.at(1).value == null ? undefined : row.at(1).value,
      episodeIndex: row.at(2).value == null ? undefined : row.at(2).value.value,
      episodeVideoLength: row.at(3).value == null ? undefined : row.at(3).value.value,
      episodeVideoSize: row.at(4).value == null ? undefined : row.at(4).value.value,
      episodePublishedTimestamp: row.at(5).value == null ? undefined : row.at(5).value.getMicroseconds(),
      episodePremierTimestamp: row.at(6).value == null ? undefined : row.at(6).value.getMicroseconds(),
    });
  }
  return resRows;
}

export interface GetEpisodeVideoFilesRow {
  episodeVideoFilename?: string,
}

export async function getEpisodeVideoFiles(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  episodeSeasonIdEq: string,
): Promise<Array<GetEpisodeVideoFilesRow>> {
  let [rows] = await run({
    sql: "SELECT Episode.videoFilename FROM Episode WHERE Episode.seasonId = @episodeSeasonIdEq",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetEpisodeVideoFilesRow>();
  for (let row of rows) {
    resRows.push({
      episodeVideoFilename: row.at(0).value == null ? undefined : row.at(0).value,
    });
  }
  return resRows;
}

export interface GetEpisodeVideoFileRow {
  episodeVideoFilename?: string,
}

export async function getEpisodeVideoFile(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  episodeSeasonIdEq: string,
  episodeEpisodeIdEq: string,
): Promise<Array<GetEpisodeVideoFileRow>> {
  let [rows] = await run({
    sql: "SELECT Episode.videoFilename FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
      episodeEpisodeIdEq: episodeEpisodeIdEq,
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetEpisodeVideoFileRow>();
  for (let row of rows) {
    resRows.push({
      episodeVideoFilename: row.at(0).value == null ? undefined : row.at(0).value,
    });
  }
  return resRows;
}

export interface GetEpisodeIndexRow {
  episodeIndex?: number,
}

export async function getEpisodeIndex(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  episodeSeasonIdEq: string,
  episodeEpisodeIdEq: string,
): Promise<Array<GetEpisodeIndexRow>> {
  let [rows] = await run({
    sql: "SELECT Episode.index FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
      episodeEpisodeIdEq: episodeEpisodeIdEq,
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetEpisodeIndexRow>();
  for (let row of rows) {
    resRows.push({
      episodeIndex: row.at(0).value == null ? undefined : row.at(0).value.value,
    });
  }
  return resRows;
}

export interface GetEpisodeIndexAndVideoRow {
  episodeIndex?: number,
  episodeVideoFilename?: string,
}

export async function getEpisodeIndexAndVideo(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  episodeSeasonIdEq: string,
  episodeEpisodeIdEq: string,
): Promise<Array<GetEpisodeIndexAndVideoRow>> {
  let [rows] = await run({
    sql: "SELECT Episode.index, Episode.videoFilename FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
      episodeEpisodeIdEq: episodeEpisodeIdEq,
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetEpisodeIndexAndVideoRow>();
  for (let row of rows) {
    resRows.push({
      episodeIndex: row.at(0).value == null ? undefined : row.at(0).value.value,
      episodeVideoFilename: row.at(1).value == null ? undefined : row.at(1).value,
    });
  }
  return resRows;
}

export interface GetEpisodesWithinIndexRangeRow {
  episodeEpisodeId?: string,
  episodeIndex?: number,
}

export async function getEpisodesWithinIndexRange(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  episodeSeasonIdEq: string,
  episodeIndexGe: number,
  episodeIndexLe: number,
): Promise<Array<GetEpisodesWithinIndexRangeRow>> {
  let [rows] = await run({
    sql: "SELECT Episode.episodeId, Episode.index FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.index >= @episodeIndexGe AND Episode.index <= @episodeIndexLe) ORDER BY Episode.index DESC",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
      episodeIndexGe: Spanner.float(episodeIndexGe),
      episodeIndexLe: Spanner.float(episodeIndexLe),
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeIndexGe: { type: "float64" },
      episodeIndexLe: { type: "float64" },
    }
  });
  let resRows = new Array<GetEpisodesWithinIndexRangeRow>();
  for (let row of rows) {
    resRows.push({
      episodeEpisodeId: row.at(0).value == null ? undefined : row.at(0).value,
      episodeIndex: row.at(1).value == null ? undefined : row.at(1).value.value,
    });
  }
  return resRows;
}

export interface GetEpisodesFollowingIndexRow {
  episodeEpisodeId?: string,
  episodeIndex?: number,
}

export async function getEpisodesFollowingIndex(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  episodeSeasonIdEq: string,
  episodeIndexGt: number,
): Promise<Array<GetEpisodesFollowingIndexRow>> {
  let [rows] = await run({
    sql: "SELECT Episode.episodeId, Episode.index FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.index > @episodeIndexGt) ORDER BY Episode.index DESC",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
      episodeIndexGt: Spanner.float(episodeIndexGt),
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeIndexGt: { type: "float64" },
    }
  });
  let resRows = new Array<GetEpisodesFollowingIndexRow>();
  for (let row of rows) {
    resRows.push({
      episodeEpisodeId: row.at(0).value == null ? undefined : row.at(0).value,
      episodeIndex: row.at(1).value == null ? undefined : row.at(1).value.value,
    });
  }
  return resRows;
}

export async function insertSeason(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  seasonId: string,
  name: string,
  coverImageFilename: string,
  state: SeasonState,
  totalEpisodes: number,
): Promise<void> {
  await run({
    sql: "INSERT Season (seasonId, name, coverImageFilename, createdTimestamp, lastChangeTimestamp, state, totalEpisodes) VALUES (@seasonId, @name, @coverImageFilename, PENDING_COMMIT_TIMESTAMP(), PENDING_COMMIT_TIMESTAMP(), @state, @totalEpisodes)",
    params: {
      seasonId: seasonId,
      name: name,
      coverImageFilename: coverImageFilename,
      state: Spanner.float(state),
      totalEpisodes: Spanner.float(totalEpisodes),
    },
    types: {
      seasonId: { type: "string" },
      name: { type: "string" },
      coverImageFilename: { type: "string" },
      state: { type: "float64" },
      totalEpisodes: { type: "float64" },
    }
  });
}

export async function insertSeasonGrade(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  seasonId: string,
  startTimestamp: number,
  endTimestamp: number,
): Promise<void> {
  await run({
    sql: "INSERT SeasonGrade (seasonId, startTimestamp, endTimestamp) VALUES (@seasonId, @startTimestamp, @endTimestamp)",
    params: {
      seasonId: seasonId,
      startTimestamp: new Date(startTimestamp).toISOString(),
      endTimestamp: new Date(endTimestamp).toISOString(),
    },
    types: {
      seasonId: { type: "string" },
      startTimestamp: { type: "timestamp" },
      endTimestamp: { type: "timestamp" },
    }
  });
}

export async function insertEpisodeDraft(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  seasonId: string,
  episodeId: string,
  name: string,
  videoFilename: string,
  videoState: VideoState,
  resumableVideoUpload: ResumableVideoUpload,
): Promise<void> {
  await run({
    sql: "INSERT EpisodeDraft (seasonId, episodeId, name, videoFilename, videoState, resumableVideoUpload) VALUES (@seasonId, @episodeId, @name, @videoFilename, @videoState, @resumableVideoUpload)",
    params: {
      seasonId: seasonId,
      episodeId: episodeId,
      name: name,
      videoFilename: videoFilename,
      videoState: Spanner.float(videoState),
      resumableVideoUpload: Buffer.from(serializeMessage(resumableVideoUpload, RESUMABLE_VIDEO_UPLOAD).buffer),
    },
    types: {
      seasonId: { type: "string" },
      episodeId: { type: "string" },
      name: { type: "string" },
      videoFilename: { type: "string" },
      videoState: { type: "float64" },
      resumableVideoUpload: { type: "bytes" },
    }
  });
}

export async function insertEpisode(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  seasonId: string,
  episodeId: string,
  name: string,
  index: number,
  videoFilename: string,
  videoLength: number,
  videoSize: number,
  premierTimestamp: number,
): Promise<void> {
  await run({
    sql: "INSERT Episode (seasonId, episodeId, name, index, videoFilename, videoLength, videoSize, publishedTimestamp, premierTimestamp) VALUES (@seasonId, @episodeId, @name, @index, @videoFilename, @videoLength, @videoSize, PENDING_COMMIT_TIMESTAMP(), @premierTimestamp)",
    params: {
      seasonId: seasonId,
      episodeId: episodeId,
      name: name,
      index: Spanner.float(index),
      videoFilename: videoFilename,
      videoLength: Spanner.float(videoLength),
      videoSize: Spanner.float(videoSize),
      premierTimestamp: new Date(premierTimestamp).toISOString(),
    },
    types: {
      seasonId: { type: "string" },
      episodeId: { type: "string" },
      name: { type: "string" },
      index: { type: "float64" },
      videoFilename: { type: "string" },
      videoLength: { type: "float64" },
      videoSize: { type: "float64" },
      premierTimestamp: { type: "timestamp" },
    }
  });
}

export async function insertDeletingCoverImageFile(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  filename: string,
): Promise<void> {
  await run({
    sql: "INSERT DeletingCoverImageFile (filename) VALUES (@filename)",
    params: {
      filename: filename,
    },
    types: {
      filename: { type: "string" },
    }
  });
}

export async function insertDeletingVideoFile(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  filename: string,
): Promise<void> {
  await run({
    sql: "INSERT DeletingVideoFile (filename) VALUES (@filename)",
    params: {
      filename: filename,
    },
    types: {
      filename: { type: "string" },
    }
  });
}

export async function updateSeason(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  setName: string,
  setDescription: string,
  seasonSeasonIdEq: string,
): Promise<void> {
  await run({
    sql: "UPDATE Season SET name = @setName, description = @setDescription, lastChangeTimestamp = PENDING_COMMIT_TIMESTAMP() WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      setName: setName,
      setDescription: setDescription,
      seasonSeasonIdEq: seasonSeasonIdEq,
    },
    types: {
      setName: { type: "string" },
      setDescription: { type: "string" },
      seasonSeasonIdEq: { type: "string" },
    }
  });
}

export async function updateSeasonState(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  setState: SeasonState,
  setTotalEpisodes: number,
  seasonSeasonIdEq: string,
): Promise<void> {
  await run({
    sql: "UPDATE Season SET state = @setState, totalEpisodes = @setTotalEpisodes, lastChangeTimestamp = PENDING_COMMIT_TIMESTAMP() WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      setState: Spanner.float(setState),
      setTotalEpisodes: Spanner.float(setTotalEpisodes),
      seasonSeasonIdEq: seasonSeasonIdEq,
    },
    types: {
      setState: { type: "float64" },
      setTotalEpisodes: { type: "float64" },
      seasonSeasonIdEq: { type: "string" },
    }
  });
}

export async function updateSeasonTotalEpisodes(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  setTotalEpisodes: number,
  seasonSeasonIdEq: string,
): Promise<void> {
  await run({
    sql: "UPDATE Season SET totalEpisodes = @setTotalEpisodes, lastChangeTimestamp = PENDING_COMMIT_TIMESTAMP() WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      setTotalEpisodes: Spanner.float(setTotalEpisodes),
      seasonSeasonIdEq: seasonSeasonIdEq,
    },
    types: {
      setTotalEpisodes: { type: "float64" },
      seasonSeasonIdEq: { type: "string" },
    }
  });
}

export async function updateSeasonLastChangeTimestamp(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  seasonSeasonIdEq: string,
): Promise<void> {
  await run({
    sql: "UPDATE Season SET lastChangeTimestamp = PENDING_COMMIT_TIMESTAMP() WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: seasonSeasonIdEq,
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
    }
  });
}

export async function updateSeasonGrade(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  setGrade: number,
  seasonGradeSeasonIdEq: string,
  seasonGradeStartTimestampEq: number,
): Promise<void> {
  await run({
    sql: "UPDATE SeasonGrade SET grade = @setGrade WHERE (SeasonGrade.seasonId = @seasonGradeSeasonIdEq AND SeasonGrade.startTimestamp = @seasonGradeStartTimestampEq)",
    params: {
      setGrade: Spanner.float(setGrade),
      seasonGradeSeasonIdEq: seasonGradeSeasonIdEq,
      seasonGradeStartTimestampEq: new Date(seasonGradeStartTimestampEq).toISOString(),
    },
    types: {
      setGrade: { type: "float64" },
      seasonGradeSeasonIdEq: { type: "string" },
      seasonGradeStartTimestampEq: { type: "timestamp" },
    }
  });
}

export async function updateSeasonGradeEndTimestamp(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  setEndTimestamp: number,
  seasonGradeSeasonIdEq: string,
  seasonGradeStartTimestampEq: number,
): Promise<void> {
  await run({
    sql: "UPDATE SeasonGrade SET endTimestamp = @setEndTimestamp WHERE (SeasonGrade.seasonId = @seasonGradeSeasonIdEq AND SeasonGrade.startTimestamp = @seasonGradeStartTimestampEq)",
    params: {
      setEndTimestamp: new Date(setEndTimestamp).toISOString(),
      seasonGradeSeasonIdEq: seasonGradeSeasonIdEq,
      seasonGradeStartTimestampEq: new Date(seasonGradeStartTimestampEq).toISOString(),
    },
    types: {
      setEndTimestamp: { type: "timestamp" },
      seasonGradeSeasonIdEq: { type: "string" },
      seasonGradeStartTimestampEq: { type: "timestamp" },
    }
  });
}

export async function updateSeasonGradeAndStartTimestamp(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  setStartTimestamp: number,
  setEndTimestamp: number,
  seasonGradeSeasonIdEq: string,
  seasonGradeStartTimestampEq: number,
): Promise<void> {
  await run({
    sql: "UPDATE SeasonGrade SET startTimestamp = @setStartTimestamp, endTimestamp = @setEndTimestamp WHERE (SeasonGrade.seasonId = @seasonGradeSeasonIdEq AND SeasonGrade.startTimestamp = @seasonGradeStartTimestampEq)",
    params: {
      setStartTimestamp: new Date(setStartTimestamp).toISOString(),
      setEndTimestamp: new Date(setEndTimestamp).toISOString(),
      seasonGradeSeasonIdEq: seasonGradeSeasonIdEq,
      seasonGradeStartTimestampEq: new Date(seasonGradeStartTimestampEq).toISOString(),
    },
    types: {
      setStartTimestamp: { type: "timestamp" },
      setEndTimestamp: { type: "timestamp" },
      seasonGradeSeasonIdEq: { type: "string" },
      seasonGradeStartTimestampEq: { type: "timestamp" },
    }
  });
}

export async function updateEpisodeDraft(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  setName: string,
  episodeDraftSeasonIdEq: string,
  episodeDraftEpisodeIdEq: string,
): Promise<void> {
  await run({
    sql: "UPDATE EpisodeDraft SET name = @setName WHERE (EpisodeDraft.seasonId = @episodeDraftSeasonIdEq AND EpisodeDraft.episodeId = @episodeDraftEpisodeIdEq)",
    params: {
      setName: setName,
      episodeDraftSeasonIdEq: episodeDraftSeasonIdEq,
      episodeDraftEpisodeIdEq: episodeDraftEpisodeIdEq,
    },
    types: {
      setName: { type: "string" },
      episodeDraftSeasonIdEq: { type: "string" },
      episodeDraftEpisodeIdEq: { type: "string" },
    }
  });
}

export async function updateEpisodeDraftResumableVideoUpload(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  setVideoState: VideoState,
  setResumableVideoUpload: ResumableVideoUpload,
  episodeDraftSeasonIdEq: string,
  episodeDraftEpisodeIdEq: string,
): Promise<void> {
  await run({
    sql: "UPDATE EpisodeDraft SET videoState = @setVideoState, resumableVideoUpload = @setResumableVideoUpload WHERE (EpisodeDraft.seasonId = @episodeDraftSeasonIdEq AND EpisodeDraft.episodeId = @episodeDraftEpisodeIdEq)",
    params: {
      setVideoState: Spanner.float(setVideoState),
      setResumableVideoUpload: Buffer.from(serializeMessage(setResumableVideoUpload, RESUMABLE_VIDEO_UPLOAD).buffer),
      episodeDraftSeasonIdEq: episodeDraftSeasonIdEq,
      episodeDraftEpisodeIdEq: episodeDraftEpisodeIdEq,
    },
    types: {
      setVideoState: { type: "float64" },
      setResumableVideoUpload: { type: "bytes" },
      episodeDraftSeasonIdEq: { type: "string" },
      episodeDraftEpisodeIdEq: { type: "string" },
    }
  });
}

export async function updateEpisodeDraftUploadedVideo(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  setVideoState: VideoState,
  setResumableVideoUpload: ResumableVideoUpload,
  setVideoUploadedTimestamp: number,
  setVideoLength: number,
  setVideoSize: number,
  episodeDraftSeasonIdEq: string,
  episodeDraftEpisodeIdEq: string,
): Promise<void> {
  await run({
    sql: "UPDATE EpisodeDraft SET videoState = @setVideoState, resumableVideoUpload = @setResumableVideoUpload, videoUploadedTimestamp = @setVideoUploadedTimestamp, videoLength = @setVideoLength, videoSize = @setVideoSize WHERE (EpisodeDraft.seasonId = @episodeDraftSeasonIdEq AND EpisodeDraft.episodeId = @episodeDraftEpisodeIdEq)",
    params: {
      setVideoState: Spanner.float(setVideoState),
      setResumableVideoUpload: Buffer.from(serializeMessage(setResumableVideoUpload, RESUMABLE_VIDEO_UPLOAD).buffer),
      setVideoUploadedTimestamp: new Date(setVideoUploadedTimestamp).toISOString(),
      setVideoLength: Spanner.float(setVideoLength),
      setVideoSize: Spanner.float(setVideoSize),
      episodeDraftSeasonIdEq: episodeDraftSeasonIdEq,
      episodeDraftEpisodeIdEq: episodeDraftEpisodeIdEq,
    },
    types: {
      setVideoState: { type: "float64" },
      setResumableVideoUpload: { type: "bytes" },
      setVideoUploadedTimestamp: { type: "timestamp" },
      setVideoLength: { type: "float64" },
      setVideoSize: { type: "float64" },
      episodeDraftSeasonIdEq: { type: "string" },
      episodeDraftEpisodeIdEq: { type: "string" },
    }
  });
}

export async function updateEpisodeIndex(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  setIndex: number,
  episodeSeasonIdEq: string,
  episodeEpisodeIdEq: string,
): Promise<void> {
  await run({
    sql: "UPDATE Episode SET index = @setIndex WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
    params: {
      setIndex: Spanner.float(setIndex),
      episodeSeasonIdEq: episodeSeasonIdEq,
      episodeEpisodeIdEq: episodeEpisodeIdEq,
    },
    types: {
      setIndex: { type: "float64" },
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
    }
  });
}

export async function deleteSeason(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  seasonSeasonIdEq: string,
): Promise<void> {
  await run({
    sql: "DELETE Season WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: seasonSeasonIdEq,
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
    }
  });
}

export async function deleteEpisodeDraft(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  episodeDraftSeasonIdEq: string,
  episodeDraftEpisodeIdEq: string,
): Promise<void> {
  await run({
    sql: "DELETE EpisodeDraft WHERE (EpisodeDraft.seasonId = @episodeDraftSeasonIdEq AND EpisodeDraft.episodeId = @episodeDraftEpisodeIdEq)",
    params: {
      episodeDraftSeasonIdEq: episodeDraftSeasonIdEq,
      episodeDraftEpisodeIdEq: episodeDraftEpisodeIdEq,
    },
    types: {
      episodeDraftSeasonIdEq: { type: "string" },
      episodeDraftEpisodeIdEq: { type: "string" },
    }
  });
}

export async function deleteEpisode(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  episodeSeasonIdEq: string,
  episodeEpisodeIdEq: string,
): Promise<void> {
  await run({
    sql: "DELETE Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
      episodeEpisodeIdEq: episodeEpisodeIdEq,
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
    }
  });
}

export async function deleteDeletingCoverImageFile(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  deletingCoverImageFileFilenameEq: string,
): Promise<void> {
  await run({
    sql: "DELETE DeletingCoverImageFile WHERE DeletingCoverImageFile.filename = @deletingCoverImageFileFilenameEq",
    params: {
      deletingCoverImageFileFilenameEq: deletingCoverImageFileFilenameEq,
    },
    types: {
      deletingCoverImageFileFilenameEq: { type: "string" },
    }
  });
}

export async function deleteDeletingVideoFile(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  deletingVideoFileFilenameEq: string,
): Promise<void> {
  await run({
    sql: "DELETE DeletingVideoFile WHERE DeletingVideoFile.filename = @deletingVideoFileFilenameEq",
    params: {
      deletingVideoFileFilenameEq: deletingVideoFileFilenameEq,
    },
    types: {
      deletingVideoFileFilenameEq: { type: "string" },
    }
  });
}
