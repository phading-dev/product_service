import { SeasonState, SEASON_STATE } from '@phading/product_service_interface/publisher/show/season_state';
import { Spanner, Database, Transaction } from '@google-cloud/spanner';
import { toEnumFromNumber, deserializeMessage, serializeMessage } from '@selfage/message/serializer';
import { ResumableVideoUpload, RESUMABLE_VIDEO_UPLOAD } from '@phading/product_service_interface/publisher/show/resumable_video_upload';
import { VideoState, VIDEO_STATE } from '@phading/product_service_interface/publisher/show/video_state';
import { Statement } from '@google-cloud/spanner/build/src/transaction';

export interface GetSeasonForConsumerRow {
  sSeasonId: string,
  sPublisherId: string,
  sName: string,
  sDescription: string | undefined,
  sCoverImageFilename: string,
  sTotalEpisodes: number,
  sgGrade: number,
}

export async function getSeasonForConsumer(
  runner: Database | Transaction,
  sSeasonIdEq: string,
  sStateEq: SeasonState,
  sgStartTimestampLe: number,
  sgEndTimestampGe: number,
): Promise<Array<GetSeasonForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT s.seasonId, s.publisherId, s.name, s.description, s.coverImageFilename, s.totalEpisodes, sg.grade FROM Season AS s INNER JOIN SeasonGrade AS sg ON s.seasonId = sg.seasonId WHERE (s.seasonId = @sSeasonIdEq AND s.state = @sStateEq AND sg.startTimestamp <= @sgStartTimestampLe AND sg.endTimestamp >= @sgEndTimestampGe)",
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
      sSeasonId: row.at(0).value,
      sPublisherId: row.at(1).value,
      sName: row.at(2).value,
      sDescription: row.at(3).value == null ? undefined : row.at(3).value,
      sCoverImageFilename: row.at(4).value,
      sTotalEpisodes: row.at(5).value.value,
      sgGrade: row.at(6).value.value,
    });
  }
  return resRows;
}

export interface GetSeasonDetailsRow {
  seasonName: string,
  seasonDescription: string | undefined,
  seasonCoverImageFilename: string,
  seasonCreatedTimestamp: number,
  seasonLastChangeTimestamp: number,
  seasonState: SeasonState,
  seasonTotalEpisodes: number,
}

export async function getSeasonDetails(
  runner: Database | Transaction,
  seasonSeasonIdEq: string,
  seasonPublisherIdEq: string,
): Promise<Array<GetSeasonDetailsRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.name, Season.description, Season.coverImageFilename, Season.createdTimestamp, Season.lastChangeTimestamp, Season.state, Season.totalEpisodes FROM Season WHERE (Season.seasonId = @seasonSeasonIdEq AND Season.publisherId = @seasonPublisherIdEq)",
    params: {
      seasonSeasonIdEq: seasonSeasonIdEq,
      seasonPublisherIdEq: seasonPublisherIdEq,
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
      seasonPublisherIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonDetailsRow>();
  for (let row of rows) {
    resRows.push({
      seasonName: row.at(0).value,
      seasonDescription: row.at(1).value == null ? undefined : row.at(1).value,
      seasonCoverImageFilename: row.at(2).value,
      seasonCreatedTimestamp: row.at(3).value.valueOf(),
      seasonLastChangeTimestamp: row.at(4).value.valueOf(),
      seasonState: toEnumFromNumber(row.at(5).value.value, SEASON_STATE),
      seasonTotalEpisodes: row.at(6).value.value,
    });
  }
  return resRows;
}

export interface GetSeasonMetadataRow {
  seasonName: string,
  seasonCoverImageFilename: string,
  seasonCreatedTimestamp: number,
  seasonLastChangeTimestamp: number,
  seasonState: SeasonState,
  seasonTotalEpisodes: number,
}

export async function getSeasonMetadata(
  runner: Database | Transaction,
  seasonSeasonIdEq: string,
  seasonPublisherIdEq: string,
): Promise<Array<GetSeasonMetadataRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.name, Season.coverImageFilename, Season.createdTimestamp, Season.lastChangeTimestamp, Season.state, Season.totalEpisodes FROM Season WHERE (Season.seasonId = @seasonSeasonIdEq AND Season.publisherId = @seasonPublisherIdEq)",
    params: {
      seasonSeasonIdEq: seasonSeasonIdEq,
      seasonPublisherIdEq: seasonPublisherIdEq,
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
      seasonPublisherIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonMetadataRow>();
  for (let row of rows) {
    resRows.push({
      seasonName: row.at(0).value,
      seasonCoverImageFilename: row.at(1).value,
      seasonCreatedTimestamp: row.at(2).value.valueOf(),
      seasonLastChangeTimestamp: row.at(3).value.valueOf(),
      seasonState: toEnumFromNumber(row.at(4).value.value, SEASON_STATE),
      seasonTotalEpisodes: row.at(5).value.value,
    });
  }
  return resRows;
}

export interface GetLastSeasonsRow {
  seasonSeasonId: string,
  seasonName: string,
  seasonCoverImageFilename: string,
  seasonCreatedTimestamp: number,
  seasonLastChangeTimestamp: number,
  seasonState: SeasonState,
  seasonTotalEpisodes: number,
}

export async function getLastSeasons(
  runner: Database | Transaction,
  seasonStateEq: SeasonState,
  seasonPublisherIdEq: string,
): Promise<Array<GetLastSeasonsRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.seasonId, Season.name, Season.coverImageFilename, Season.createdTimestamp, Season.lastChangeTimestamp, Season.state, Season.totalEpisodes FROM Season WHERE (Season.state = @seasonStateEq AND Season.publisherId = @seasonPublisherIdEq) ORDER BY Season.lastChangeTimestamp DESC LIMIT 20",
    params: {
      seasonStateEq: Spanner.float(seasonStateEq),
      seasonPublisherIdEq: seasonPublisherIdEq,
    },
    types: {
      seasonStateEq: { type: "float64" },
      seasonPublisherIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetLastSeasonsRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value,
      seasonName: row.at(1).value,
      seasonCoverImageFilename: row.at(2).value,
      seasonCreatedTimestamp: row.at(3).value.valueOf(),
      seasonLastChangeTimestamp: row.at(4).value.valueOf(),
      seasonState: toEnumFromNumber(row.at(5).value.value, SEASON_STATE),
      seasonTotalEpisodes: row.at(6).value.value,
    });
  }
  return resRows;
}

export interface GetMoreSeasonsRow {
  seasonSeasonId: string,
  seasonName: string,
  seasonCoverImageFilename: string,
  seasonCreatedTimestamp: number,
  seasonLastChangeTimestamp: number,
  seasonState: SeasonState,
  seasonTotalEpisodes: number,
}

export async function getMoreSeasons(
  runner: Database | Transaction,
  seasonLastChangeTimestampLt: number,
  seasonStateEq: SeasonState,
  seasonPublisherIdEq: string,
): Promise<Array<GetMoreSeasonsRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.seasonId, Season.name, Season.coverImageFilename, Season.createdTimestamp, Season.lastChangeTimestamp, Season.state, Season.totalEpisodes FROM Season WHERE (Season.lastChangeTimestamp < @seasonLastChangeTimestampLt AND Season.state = @seasonStateEq AND Season.publisherId = @seasonPublisherIdEq) ORDER BY Season.lastChangeTimestamp DESC LIMIT 20",
    params: {
      seasonLastChangeTimestampLt: new Date(seasonLastChangeTimestampLt).toISOString(),
      seasonStateEq: Spanner.float(seasonStateEq),
      seasonPublisherIdEq: seasonPublisherIdEq,
    },
    types: {
      seasonLastChangeTimestampLt: { type: "timestamp" },
      seasonStateEq: { type: "float64" },
      seasonPublisherIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetMoreSeasonsRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value,
      seasonName: row.at(1).value,
      seasonCoverImageFilename: row.at(2).value,
      seasonCreatedTimestamp: row.at(3).value.valueOf(),
      seasonLastChangeTimestamp: row.at(4).value.valueOf(),
      seasonState: toEnumFromNumber(row.at(5).value.value, SEASON_STATE),
      seasonTotalEpisodes: row.at(6).value.value,
    });
  }
  return resRows;
}

export interface GetLastTwoSeasonGradeRow {
  seasonGradeGradeId: string,
  seasonGradeGrade: number,
  seasonGradeStartTimestamp: number,
  seasonGradeEndTimestamp: number,
}

export async function getLastTwoSeasonGrade(
  runner: Database | Transaction,
  seasonGradeSeasonIdEq: string,
  seasonGradeEndTimestampGe: number,
): Promise<Array<GetLastTwoSeasonGradeRow>> {
  let [rows] = await runner.run({
    sql: "SELECT SeasonGrade.gradeId, SeasonGrade.grade, SeasonGrade.startTimestamp, SeasonGrade.endTimestamp FROM SeasonGrade WHERE (SeasonGrade.seasonId = @seasonGradeSeasonIdEq AND SeasonGrade.endTimestamp >= @seasonGradeEndTimestampGe) ORDER BY SeasonGrade.endTimestamp DESC LIMIT 2",
    params: {
      seasonGradeSeasonIdEq: seasonGradeSeasonIdEq,
      seasonGradeEndTimestampGe: new Date(seasonGradeEndTimestampGe).toISOString(),
    },
    types: {
      seasonGradeSeasonIdEq: { type: "string" },
      seasonGradeEndTimestampGe: { type: "timestamp" },
    }
  });
  let resRows = new Array<GetLastTwoSeasonGradeRow>();
  for (let row of rows) {
    resRows.push({
      seasonGradeGradeId: row.at(0).value,
      seasonGradeGrade: row.at(1).value.value,
      seasonGradeStartTimestamp: row.at(2).value.valueOf(),
      seasonGradeEndTimestamp: row.at(3).value.valueOf(),
    });
  }
  return resRows;
}

export interface GetEpisodeDraftsRow {
  episodeDraftEpisodeId: string,
  episodeDraftName: string | undefined,
  episodeDraftVideoFilename: string,
  episodeDraftResumableVideoUpload: ResumableVideoUpload,
  episodeDraftVideoState: VideoState,
  episodeDraftVideoUploadedTimestamp: number | undefined,
  episodeDraftVideoDuration: number | undefined,
  episodeDraftVideoSize: number | undefined,
}

export async function getEpisodeDrafts(
  runner: Database | Transaction,
  episodeDraftSeasonIdEq: string,
): Promise<Array<GetEpisodeDraftsRow>> {
  let [rows] = await runner.run({
    sql: "SELECT EpisodeDraft.episodeId, EpisodeDraft.name, EpisodeDraft.videoFilename, EpisodeDraft.resumableVideoUpload, EpisodeDraft.videoState, EpisodeDraft.videoUploadedTimestamp, EpisodeDraft.videoDuration, EpisodeDraft.videoSize FROM EpisodeDraft WHERE EpisodeDraft.seasonId = @episodeDraftSeasonIdEq ORDER BY EpisodeDraft.videoUploadedTimestamp DESC",
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
      episodeDraftEpisodeId: row.at(0).value,
      episodeDraftName: row.at(1).value == null ? undefined : row.at(1).value,
      episodeDraftVideoFilename: row.at(2).value,
      episodeDraftResumableVideoUpload: deserializeMessage(row.at(3).value, RESUMABLE_VIDEO_UPLOAD),
      episodeDraftVideoState: toEnumFromNumber(row.at(4).value.value, VIDEO_STATE),
      episodeDraftVideoUploadedTimestamp: row.at(5).value == null ? undefined : row.at(5).value.valueOf(),
      episodeDraftVideoDuration: row.at(6).value == null ? undefined : row.at(6).value.value,
      episodeDraftVideoSize: row.at(7).value == null ? undefined : row.at(7).value.value,
    });
  }
  return resRows;
}

export interface GetEpisodeDraftRow {
  episodeDraftName: string | undefined,
  episodeDraftVideoFilename: string,
  episodeDraftResumableVideoUpload: ResumableVideoUpload,
  episodeDraftVideoState: VideoState,
  episodeDraftVideoUploadedTimestamp: number | undefined,
  episodeDraftVideoDuration: number | undefined,
  episodeDraftVideoSize: number | undefined,
}

export async function getEpisodeDraft(
  runner: Database | Transaction,
  episodeDraftSeasonIdEq: string,
  episodeDraftEpisodeIdEq: string,
): Promise<Array<GetEpisodeDraftRow>> {
  let [rows] = await runner.run({
    sql: "SELECT EpisodeDraft.name, EpisodeDraft.videoFilename, EpisodeDraft.resumableVideoUpload, EpisodeDraft.videoState, EpisodeDraft.videoUploadedTimestamp, EpisodeDraft.videoDuration, EpisodeDraft.videoSize FROM EpisodeDraft WHERE (EpisodeDraft.seasonId = @episodeDraftSeasonIdEq AND EpisodeDraft.episodeId = @episodeDraftEpisodeIdEq)",
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
      episodeDraftVideoFilename: row.at(1).value,
      episodeDraftResumableVideoUpload: deserializeMessage(row.at(2).value, RESUMABLE_VIDEO_UPLOAD),
      episodeDraftVideoState: toEnumFromNumber(row.at(3).value.value, VIDEO_STATE),
      episodeDraftVideoUploadedTimestamp: row.at(4).value == null ? undefined : row.at(4).value.valueOf(),
      episodeDraftVideoDuration: row.at(5).value == null ? undefined : row.at(5).value.value,
      episodeDraftVideoSize: row.at(6).value == null ? undefined : row.at(6).value.value,
    });
  }
  return resRows;
}

export interface GetAllEpisodeDraftVideoFilesRow {
  episodeDraftVideoFilename: string,
}

export async function getAllEpisodeDraftVideoFiles(
  runner: Database | Transaction,
  episodeDraftSeasonIdEq: string,
): Promise<Array<GetAllEpisodeDraftVideoFilesRow>> {
  let [rows] = await runner.run({
    sql: "SELECT EpisodeDraft.videoFilename FROM EpisodeDraft WHERE EpisodeDraft.seasonId = @episodeDraftSeasonIdEq",
    params: {
      episodeDraftSeasonIdEq: episodeDraftSeasonIdEq,
    },
    types: {
      episodeDraftSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetAllEpisodeDraftVideoFilesRow>();
  for (let row of rows) {
    resRows.push({
      episodeDraftVideoFilename: row.at(0).value,
    });
  }
  return resRows;
}

export interface GetEpisodeForConsumerRow {
  episodeName: string | undefined,
  episodeIndex: number,
  episodeVideoDuration: number,
  episodePremierTimestamp: number,
}

export async function getEpisodeForConsumer(
  runner: Database | Transaction,
  episodeSeasonIdEq: string,
  episodeEpisodeIdEq: string,
): Promise<Array<GetEpisodeForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Episode.name, Episode.index, Episode.videoDuration, Episode.premierTimestamp FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
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
      episodeIndex: row.at(1).value.value,
      episodeVideoDuration: row.at(2).value.value,
      episodePremierTimestamp: row.at(3).value.valueOf(),
    });
  }
  return resRows;
}

export interface GetEpisodeForConsumerByIndexRow {
  episodeEpisodeId: string,
  episodeName: string | undefined,
  episodeVideoDuration: number,
  episodePremierTimestamp: number,
}

export async function getEpisodeForConsumerByIndex(
  runner: Database | Transaction,
  episodeSeasonIdEq: string,
  episodeIndexEq: number,
): Promise<Array<GetEpisodeForConsumerByIndexRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Episode.episodeId, Episode.name, Episode.videoDuration, Episode.premierTimestamp FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.index = @episodeIndexEq)",
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
      episodeEpisodeId: row.at(0).value,
      episodeName: row.at(1).value == null ? undefined : row.at(1).value,
      episodeVideoDuration: row.at(2).value.value,
      episodePremierTimestamp: row.at(3).value.valueOf(),
    });
  }
  return resRows;
}

export interface GetNextEpisodesForConsumerRow {
  eEpisodeId: string,
  eName: string | undefined,
  eIndex: number,
  eVideoDuration: number,
  ePremierTimestamp: number,
}

export async function getNextEpisodesForConsumer(
  runner: Database | Transaction,
  eSeasonIdEq: string,
  eIndexGt: number,
  sStateEq: SeasonState,
): Promise<Array<GetNextEpisodesForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.episodeId, e.name, e.index, e.videoDuration, e.premierTimestamp FROM Season AS s INNER JOIN Episode AS e ON s.seasonId = e.seasonId WHERE (e.seasonId = @eSeasonIdEq AND e.index > @eIndexGt AND s.state = @sStateEq) ORDER BY e.index LIMIT 20",
    params: {
      eSeasonIdEq: eSeasonIdEq,
      eIndexGt: Spanner.float(eIndexGt),
      sStateEq: Spanner.float(sStateEq),
    },
    types: {
      eSeasonIdEq: { type: "string" },
      eIndexGt: { type: "float64" },
      sStateEq: { type: "float64" },
    }
  });
  let resRows = new Array<GetNextEpisodesForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      eEpisodeId: row.at(0).value,
      eName: row.at(1).value == null ? undefined : row.at(1).value,
      eIndex: row.at(2).value.value,
      eVideoDuration: row.at(3).value.value,
      ePremierTimestamp: row.at(4).value.valueOf(),
    });
  }
  return resRows;
}

export interface GetPrevEpisodesForConsumerRow {
  eEpisodeId: string,
  eName: string | undefined,
  eIndex: number,
  eVideoDuration: number,
  ePremierTimestamp: number,
}

export async function getPrevEpisodesForConsumer(
  runner: Database | Transaction,
  eSeasonIdEq: string,
  eIndexLt: number,
  sStateEq: SeasonState,
): Promise<Array<GetPrevEpisodesForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.episodeId, e.name, e.index, e.videoDuration, e.premierTimestamp FROM Season AS s INNER JOIN Episode AS e ON s.seasonId = e.seasonId WHERE (e.seasonId = @eSeasonIdEq AND e.index < @eIndexLt AND s.state = @sStateEq) ORDER BY e.index DESC LIMIT 20",
    params: {
      eSeasonIdEq: eSeasonIdEq,
      eIndexLt: Spanner.float(eIndexLt),
      sStateEq: Spanner.float(sStateEq),
    },
    types: {
      eSeasonIdEq: { type: "string" },
      eIndexLt: { type: "float64" },
      sStateEq: { type: "float64" },
    }
  });
  let resRows = new Array<GetPrevEpisodesForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      eEpisodeId: row.at(0).value,
      eName: row.at(1).value == null ? undefined : row.at(1).value,
      eIndex: row.at(2).value.value,
      eVideoDuration: row.at(3).value.value,
      ePremierTimestamp: row.at(4).value.valueOf(),
    });
  }
  return resRows;
}

export interface GetEpisodeVideoFileForConsumerRow {
  eVideoFilename: string,
}

export async function getEpisodeVideoFileForConsumer(
  runner: Database | Transaction,
  eSeasonIdEq: string,
  eEpisodeIdEq: string,
  sStateEq: SeasonState,
): Promise<Array<GetEpisodeVideoFileForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.videoFilename FROM Season AS s INNER JOIN Episode AS e ON s.seasonId = e.seasonId WHERE (e.seasonId = @eSeasonIdEq AND e.episodeId = @eEpisodeIdEq AND s.state = @sStateEq)",
    params: {
      eSeasonIdEq: eSeasonIdEq,
      eEpisodeIdEq: eEpisodeIdEq,
      sStateEq: Spanner.float(sStateEq),
    },
    types: {
      eSeasonIdEq: { type: "string" },
      eEpisodeIdEq: { type: "string" },
      sStateEq: { type: "float64" },
    }
  });
  let resRows = new Array<GetEpisodeVideoFileForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      eVideoFilename: row.at(0).value,
    });
  }
  return resRows;
}

export interface GetLastEpisodesRow {
  episodeEpisodeId: string,
  episodeName: string | undefined,
  episodeIndex: number,
  episodeVideoDuration: number,
  episodeVideoSize: number,
  episodePublishedTimestamp: number,
  episodePremierTimestamp: number,
}

export async function getLastEpisodes(
  runner: Database | Transaction,
  episodeSeasonIdEq: string,
): Promise<Array<GetLastEpisodesRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Episode.episodeId, Episode.name, Episode.index, Episode.videoDuration, Episode.videoSize, Episode.publishedTimestamp, Episode.premierTimestamp FROM Episode WHERE Episode.seasonId = @episodeSeasonIdEq ORDER BY Episode.index DESC LIMIT 20",
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
      episodeEpisodeId: row.at(0).value,
      episodeName: row.at(1).value == null ? undefined : row.at(1).value,
      episodeIndex: row.at(2).value.value,
      episodeVideoDuration: row.at(3).value.value,
      episodeVideoSize: row.at(4).value.value,
      episodePublishedTimestamp: row.at(5).value.valueOf(),
      episodePremierTimestamp: row.at(6).value.valueOf(),
    });
  }
  return resRows;
}

export interface GetPrevEpisodesRow {
  episodeEpisodeId: string,
  episodeName: string | undefined,
  episodeIndex: number,
  episodeVideoDuration: number,
  episodeVideoSize: number,
  episodePublishedTimestamp: number,
  episodePremierTimestamp: number,
}

export async function getPrevEpisodes(
  runner: Database | Transaction,
  episodeSeasonIdEq: string,
  episodeIndexLt: number,
): Promise<Array<GetPrevEpisodesRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Episode.episodeId, Episode.name, Episode.index, Episode.videoDuration, Episode.videoSize, Episode.publishedTimestamp, Episode.premierTimestamp FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.index < @episodeIndexLt) ORDER BY Episode.index DESC LIMIT 20",
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
      episodeEpisodeId: row.at(0).value,
      episodeName: row.at(1).value == null ? undefined : row.at(1).value,
      episodeIndex: row.at(2).value.value,
      episodeVideoDuration: row.at(3).value.value,
      episodeVideoSize: row.at(4).value.value,
      episodePublishedTimestamp: row.at(5).value.valueOf(),
      episodePremierTimestamp: row.at(6).value.valueOf(),
    });
  }
  return resRows;
}

export interface GetNextEpisodesRow {
  episodeEpisodeId: string,
  episodeName: string | undefined,
  episodeIndex: number,
  episodeVideoDuration: number,
  episodeVideoSize: number,
  episodePublishedTimestamp: number,
  episodePremierTimestamp: number,
}

export async function getNextEpisodes(
  runner: Database | Transaction,
  episodeSeasonIdEq: string,
  episodeIndexGt: number,
): Promise<Array<GetNextEpisodesRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Episode.episodeId, Episode.name, Episode.index, Episode.videoDuration, Episode.videoSize, Episode.publishedTimestamp, Episode.premierTimestamp FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.index > @episodeIndexGt) ORDER BY Episode.index DESC LIMIT 20",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
      episodeIndexGt: Spanner.float(episodeIndexGt),
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeIndexGt: { type: "float64" },
    }
  });
  let resRows = new Array<GetNextEpisodesRow>();
  for (let row of rows) {
    resRows.push({
      episodeEpisodeId: row.at(0).value,
      episodeName: row.at(1).value == null ? undefined : row.at(1).value,
      episodeIndex: row.at(2).value.value,
      episodeVideoDuration: row.at(3).value.value,
      episodeVideoSize: row.at(4).value.value,
      episodePublishedTimestamp: row.at(5).value.valueOf(),
      episodePremierTimestamp: row.at(6).value.valueOf(),
    });
  }
  return resRows;
}

export interface GetEpisodesWithinIndexRangeRow {
  episodeEpisodeId: string,
  episodeName: string | undefined,
  episodeIndex: number,
  episodeVideoDuration: number,
  episodeVideoSize: number,
  episodePublishedTimestamp: number,
  episodePremierTimestamp: number,
}

export async function getEpisodesWithinIndexRange(
  runner: Database | Transaction,
  episodeSeasonIdEq: string,
  episodeIndexGe: number,
  episodeIndexLe: number,
): Promise<Array<GetEpisodesWithinIndexRangeRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Episode.episodeId, Episode.name, Episode.index, Episode.videoDuration, Episode.videoSize, Episode.publishedTimestamp, Episode.premierTimestamp FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.index >= @episodeIndexGe AND Episode.index <= @episodeIndexLe) ORDER BY Episode.index DESC",
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
      episodeEpisodeId: row.at(0).value,
      episodeName: row.at(1).value == null ? undefined : row.at(1).value,
      episodeIndex: row.at(2).value.value,
      episodeVideoDuration: row.at(3).value.value,
      episodeVideoSize: row.at(4).value.value,
      episodePublishedTimestamp: row.at(5).value.valueOf(),
      episodePremierTimestamp: row.at(6).value.valueOf(),
    });
  }
  return resRows;
}

export interface GetEpisodeRow {
  episodeEpisodeId: string,
  episodeName: string | undefined,
  episodeIndex: number,
  episodeVideoFilename: string,
  episodeVideoDuration: number,
  episodeVideoSize: number,
  episodePublishedTimestamp: number,
  episodePremierTimestamp: number,
}

export async function getEpisode(
  runner: Database | Transaction,
  episodeSeasonIdEq: string,
  episodeEpisodeIdEq: string,
): Promise<Array<GetEpisodeRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Episode.episodeId, Episode.name, Episode.index, Episode.videoFilename, Episode.videoDuration, Episode.videoSize, Episode.publishedTimestamp, Episode.premierTimestamp FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
      episodeEpisodeIdEq: episodeEpisodeIdEq,
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetEpisodeRow>();
  for (let row of rows) {
    resRows.push({
      episodeEpisodeId: row.at(0).value,
      episodeName: row.at(1).value == null ? undefined : row.at(1).value,
      episodeIndex: row.at(2).value.value,
      episodeVideoFilename: row.at(3).value,
      episodeVideoDuration: row.at(4).value.value,
      episodeVideoSize: row.at(5).value.value,
      episodePublishedTimestamp: row.at(6).value.valueOf(),
      episodePremierTimestamp: row.at(7).value.valueOf(),
    });
  }
  return resRows;
}

export interface GetAllEpisodeVideoFilesRow {
  episodeVideoFilename: string,
}

export async function getAllEpisodeVideoFiles(
  runner: Database | Transaction,
  episodeSeasonIdEq: string,
): Promise<Array<GetAllEpisodeVideoFilesRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Episode.videoFilename FROM Episode WHERE Episode.seasonId = @episodeSeasonIdEq",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetAllEpisodeVideoFilesRow>();
  for (let row of rows) {
    resRows.push({
      episodeVideoFilename: row.at(0).value,
    });
  }
  return resRows;
}

export interface GetVideoFilesRow {
  videoFileFilename: string,
}

export async function getVideoFiles(
  runner: Database | Transaction,
  videoFileUsedEq: boolean,
): Promise<Array<GetVideoFilesRow>> {
  let [rows] = await runner.run({
    sql: "SELECT VideoFile.filename FROM VideoFile WHERE VideoFile.used = @videoFileUsedEq",
    params: {
      videoFileUsedEq: videoFileUsedEq,
    },
    types: {
      videoFileUsedEq: { type: "bool" },
    }
  });
  let resRows = new Array<GetVideoFilesRow>();
  for (let row of rows) {
    resRows.push({
      videoFileFilename: row.at(0).value,
    });
  }
  return resRows;
}

export interface GetDeletingCoverImageFilesRow {
  deletingCoverImageFileFilename: string,
}

export async function getDeletingCoverImageFiles(
  runner: Database | Transaction,
): Promise<Array<GetDeletingCoverImageFilesRow>> {
  let [rows] = await runner.run({
    sql: "SELECT DeletingCoverImageFile.filename FROM DeletingCoverImageFile",
    params: {
    },
    types: {
    }
  });
  let resRows = new Array<GetDeletingCoverImageFilesRow>();
  for (let row of rows) {
    resRows.push({
      deletingCoverImageFileFilename: row.at(0).value,
    });
  }
  return resRows;
}

export function insertSeasonStatement(
  seasonId: string,
  publisherId: string,
  name: string,
  coverImageFilename: string,
  createdTimestamp: number,
  lastChangeTimestamp: number,
  state: SeasonState,
  totalEpisodes: number,
): Statement {
  return {
    sql: "INSERT Season (seasonId, publisherId, name, coverImageFilename, createdTimestamp, lastChangeTimestamp, state, totalEpisodes) VALUES (@seasonId, @publisherId, @name, @coverImageFilename, @createdTimestamp, @lastChangeTimestamp, @state, @totalEpisodes)",
    params: {
      seasonId: seasonId,
      publisherId: publisherId,
      name: name,
      coverImageFilename: coverImageFilename,
      createdTimestamp: new Date(createdTimestamp).toISOString(),
      lastChangeTimestamp: new Date(lastChangeTimestamp).toISOString(),
      state: Spanner.float(state),
      totalEpisodes: Spanner.float(totalEpisodes),
    },
    types: {
      seasonId: { type: "string" },
      publisherId: { type: "string" },
      name: { type: "string" },
      coverImageFilename: { type: "string" },
      createdTimestamp: { type: "timestamp" },
      lastChangeTimestamp: { type: "timestamp" },
      state: { type: "float64" },
      totalEpisodes: { type: "float64" },
    }
  };
}

export function insertSeasonGradeStatement(
  seasonId: string,
  gradeId: string,
  grade: number,
  startTimestamp: number,
  endTimestamp: number,
): Statement {
  return {
    sql: "INSERT SeasonGrade (seasonId, gradeId, grade, startTimestamp, endTimestamp) VALUES (@seasonId, @gradeId, @grade, @startTimestamp, @endTimestamp)",
    params: {
      seasonId: seasonId,
      gradeId: gradeId,
      grade: Spanner.float(grade),
      startTimestamp: new Date(startTimestamp).toISOString(),
      endTimestamp: new Date(endTimestamp).toISOString(),
    },
    types: {
      seasonId: { type: "string" },
      gradeId: { type: "string" },
      grade: { type: "float64" },
      startTimestamp: { type: "timestamp" },
      endTimestamp: { type: "timestamp" },
    }
  };
}

export function insertEpisodeDraftStatement(
  seasonId: string,
  episodeId: string,
  name: string | null | undefined,
  videoFilename: string,
  videoState: VideoState,
  resumableVideoUpload: ResumableVideoUpload,
): Statement {
  return {
    sql: "INSERT EpisodeDraft (seasonId, episodeId, name, videoFilename, videoState, resumableVideoUpload) VALUES (@seasonId, @episodeId, @name, @videoFilename, @videoState, @resumableVideoUpload)",
    params: {
      seasonId: seasonId,
      episodeId: episodeId,
      name: name == null ? null : name,
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
  };
}

export function insertEpisodeStatement(
  seasonId: string,
  episodeId: string,
  name: string | null | undefined,
  index: number,
  videoFilename: string,
  videoDuration: number,
  videoSize: number,
  publishedTimestamp: number,
  premierTimestamp: number,
): Statement {
  return {
    sql: "INSERT Episode (seasonId, episodeId, name, index, videoFilename, videoDuration, videoSize, publishedTimestamp, premierTimestamp) VALUES (@seasonId, @episodeId, @name, @index, @videoFilename, @videoDuration, @videoSize, @publishedTimestamp, @premierTimestamp)",
    params: {
      seasonId: seasonId,
      episodeId: episodeId,
      name: name == null ? null : name,
      index: Spanner.float(index),
      videoFilename: videoFilename,
      videoDuration: Spanner.float(videoDuration),
      videoSize: Spanner.float(videoSize),
      publishedTimestamp: new Date(publishedTimestamp).toISOString(),
      premierTimestamp: new Date(premierTimestamp).toISOString(),
    },
    types: {
      seasonId: { type: "string" },
      episodeId: { type: "string" },
      name: { type: "string" },
      index: { type: "float64" },
      videoFilename: { type: "string" },
      videoDuration: { type: "float64" },
      videoSize: { type: "float64" },
      publishedTimestamp: { type: "timestamp" },
      premierTimestamp: { type: "timestamp" },
    }
  };
}

export function insertDeletingCoverImageFileStatement(
  filename: string,
): Statement {
  return {
    sql: "INSERT DeletingCoverImageFile (filename) VALUES (@filename)",
    params: {
      filename: filename,
    },
    types: {
      filename: { type: "string" },
    }
  };
}

export function insertVideoFileStatement(
  filename: string,
  used: boolean,
): Statement {
  return {
    sql: "INSERT VideoFile (filename, used) VALUES (@filename, @used)",
    params: {
      filename: filename,
      used: used,
    },
    types: {
      filename: { type: "string" },
      used: { type: "bool" },
    }
  };
}

export function updateSeasonStatement(
  setName: string,
  setDescription: string | null | undefined,
  setLastChangeTimestamp: number,
  seasonSeasonIdEq: string,
): Statement {
  return {
    sql: "UPDATE Season SET name = @setName, description = @setDescription, lastChangeTimestamp = @setLastChangeTimestamp WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      setName: setName,
      setDescription: setDescription == null ? null : setDescription,
      setLastChangeTimestamp: new Date(setLastChangeTimestamp).toISOString(),
      seasonSeasonIdEq: seasonSeasonIdEq,
    },
    types: {
      setName: { type: "string" },
      setDescription: { type: "string" },
      setLastChangeTimestamp: { type: "timestamp" },
      seasonSeasonIdEq: { type: "string" },
    }
  };
}

export function updateSeasonStateStatement(
  setState: SeasonState,
  setTotalEpisodes: number,
  setLastChangeTimestamp: number,
  seasonSeasonIdEq: string,
): Statement {
  return {
    sql: "UPDATE Season SET state = @setState, totalEpisodes = @setTotalEpisodes, lastChangeTimestamp = @setLastChangeTimestamp WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      setState: Spanner.float(setState),
      setTotalEpisodes: Spanner.float(setTotalEpisodes),
      setLastChangeTimestamp: new Date(setLastChangeTimestamp).toISOString(),
      seasonSeasonIdEq: seasonSeasonIdEq,
    },
    types: {
      setState: { type: "float64" },
      setTotalEpisodes: { type: "float64" },
      setLastChangeTimestamp: { type: "timestamp" },
      seasonSeasonIdEq: { type: "string" },
    }
  };
}

export function updateSeasonTotalEpisodesStatement(
  setTotalEpisodes: number,
  setLastChangeTimestamp: number,
  seasonSeasonIdEq: string,
): Statement {
  return {
    sql: "UPDATE Season SET totalEpisodes = @setTotalEpisodes, lastChangeTimestamp = @setLastChangeTimestamp WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      setTotalEpisodes: Spanner.float(setTotalEpisodes),
      setLastChangeTimestamp: new Date(setLastChangeTimestamp).toISOString(),
      seasonSeasonIdEq: seasonSeasonIdEq,
    },
    types: {
      setTotalEpisodes: { type: "float64" },
      setLastChangeTimestamp: { type: "timestamp" },
      seasonSeasonIdEq: { type: "string" },
    }
  };
}

export function updateSeasonLastChangeTimestampStatement(
  setLastChangeTimestamp: number,
  seasonSeasonIdEq: string,
): Statement {
  return {
    sql: "UPDATE Season SET lastChangeTimestamp = @setLastChangeTimestamp WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      setLastChangeTimestamp: new Date(setLastChangeTimestamp).toISOString(),
      seasonSeasonIdEq: seasonSeasonIdEq,
    },
    types: {
      setLastChangeTimestamp: { type: "timestamp" },
      seasonSeasonIdEq: { type: "string" },
    }
  };
}

export function updateSeasonGradeStatement(
  setGrade: number,
  seasonGradeSeasonIdEq: string,
  seasonGradeGradeIdEq: string,
): Statement {
  return {
    sql: "UPDATE SeasonGrade SET grade = @setGrade WHERE (SeasonGrade.seasonId = @seasonGradeSeasonIdEq AND SeasonGrade.gradeId = @seasonGradeGradeIdEq)",
    params: {
      setGrade: Spanner.float(setGrade),
      seasonGradeSeasonIdEq: seasonGradeSeasonIdEq,
      seasonGradeGradeIdEq: seasonGradeGradeIdEq,
    },
    types: {
      setGrade: { type: "float64" },
      seasonGradeSeasonIdEq: { type: "string" },
      seasonGradeGradeIdEq: { type: "string" },
    }
  };
}

export function updateSeasonGradeEndTimestampStatement(
  setEndTimestamp: number,
  seasonGradeSeasonIdEq: string,
  seasonGradeGradeIdEq: string,
): Statement {
  return {
    sql: "UPDATE SeasonGrade SET endTimestamp = @setEndTimestamp WHERE (SeasonGrade.seasonId = @seasonGradeSeasonIdEq AND SeasonGrade.gradeId = @seasonGradeGradeIdEq)",
    params: {
      setEndTimestamp: new Date(setEndTimestamp).toISOString(),
      seasonGradeSeasonIdEq: seasonGradeSeasonIdEq,
      seasonGradeGradeIdEq: seasonGradeGradeIdEq,
    },
    types: {
      setEndTimestamp: { type: "timestamp" },
      seasonGradeSeasonIdEq: { type: "string" },
      seasonGradeGradeIdEq: { type: "string" },
    }
  };
}

export function updateSeasonGradeAndStartTimestampStatement(
  setGrade: number,
  setStartTimestamp: number,
  seasonGradeSeasonIdEq: string,
  seasonGradeGradeIdEq: string,
): Statement {
  return {
    sql: "UPDATE SeasonGrade SET grade = @setGrade, startTimestamp = @setStartTimestamp WHERE (SeasonGrade.seasonId = @seasonGradeSeasonIdEq AND SeasonGrade.gradeId = @seasonGradeGradeIdEq)",
    params: {
      setGrade: Spanner.float(setGrade),
      setStartTimestamp: new Date(setStartTimestamp).toISOString(),
      seasonGradeSeasonIdEq: seasonGradeSeasonIdEq,
      seasonGradeGradeIdEq: seasonGradeGradeIdEq,
    },
    types: {
      setGrade: { type: "float64" },
      setStartTimestamp: { type: "timestamp" },
      seasonGradeSeasonIdEq: { type: "string" },
      seasonGradeGradeIdEq: { type: "string" },
    }
  };
}

export function updateEpisodeDraftStatement(
  setName: string | null | undefined,
  episodeDraftSeasonIdEq: string,
  episodeDraftEpisodeIdEq: string,
): Statement {
  return {
    sql: "UPDATE EpisodeDraft SET name = @setName WHERE (EpisodeDraft.seasonId = @episodeDraftSeasonIdEq AND EpisodeDraft.episodeId = @episodeDraftEpisodeIdEq)",
    params: {
      setName: setName == null ? null : setName,
      episodeDraftSeasonIdEq: episodeDraftSeasonIdEq,
      episodeDraftEpisodeIdEq: episodeDraftEpisodeIdEq,
    },
    types: {
      setName: { type: "string" },
      episodeDraftSeasonIdEq: { type: "string" },
      episodeDraftEpisodeIdEq: { type: "string" },
    }
  };
}

export function updateEpisodeDraftNewVideoStatement(
  setVideoFilename: string,
  setVideoState: VideoState,
  setResumableVideoUpload: ResumableVideoUpload,
  episodeDraftSeasonIdEq: string,
  episodeDraftEpisodeIdEq: string,
): Statement {
  return {
    sql: "UPDATE EpisodeDraft SET videoFilename = @setVideoFilename, videoState = @setVideoState, resumableVideoUpload = @setResumableVideoUpload WHERE (EpisodeDraft.seasonId = @episodeDraftSeasonIdEq AND EpisodeDraft.episodeId = @episodeDraftEpisodeIdEq)",
    params: {
      setVideoFilename: setVideoFilename,
      setVideoState: Spanner.float(setVideoState),
      setResumableVideoUpload: Buffer.from(serializeMessage(setResumableVideoUpload, RESUMABLE_VIDEO_UPLOAD).buffer),
      episodeDraftSeasonIdEq: episodeDraftSeasonIdEq,
      episodeDraftEpisodeIdEq: episodeDraftEpisodeIdEq,
    },
    types: {
      setVideoFilename: { type: "string" },
      setVideoState: { type: "float64" },
      setResumableVideoUpload: { type: "bytes" },
      episodeDraftSeasonIdEq: { type: "string" },
      episodeDraftEpisodeIdEq: { type: "string" },
    }
  };
}

export function updateEpisodeDraftResumableVideoUploadStatement(
  setVideoState: VideoState,
  setResumableVideoUpload: ResumableVideoUpload,
  episodeDraftSeasonIdEq: string,
  episodeDraftEpisodeIdEq: string,
): Statement {
  return {
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
  };
}

export function updateEpisodeDraftUploadedVideoStatement(
  setVideoState: VideoState,
  setResumableVideoUpload: ResumableVideoUpload,
  setVideoUploadedTimestamp: number | null | undefined,
  setVideoDuration: number | null | undefined,
  setVideoSize: number | null | undefined,
  episodeDraftSeasonIdEq: string,
  episodeDraftEpisodeIdEq: string,
): Statement {
  return {
    sql: "UPDATE EpisodeDraft SET videoState = @setVideoState, resumableVideoUpload = @setResumableVideoUpload, videoUploadedTimestamp = @setVideoUploadedTimestamp, videoDuration = @setVideoDuration, videoSize = @setVideoSize WHERE (EpisodeDraft.seasonId = @episodeDraftSeasonIdEq AND EpisodeDraft.episodeId = @episodeDraftEpisodeIdEq)",
    params: {
      setVideoState: Spanner.float(setVideoState),
      setResumableVideoUpload: Buffer.from(serializeMessage(setResumableVideoUpload, RESUMABLE_VIDEO_UPLOAD).buffer),
      setVideoUploadedTimestamp: setVideoUploadedTimestamp == null ? null : new Date(setVideoUploadedTimestamp).toISOString(),
      setVideoDuration: setVideoDuration == null ? null : Spanner.float(setVideoDuration),
      setVideoSize: setVideoSize == null ? null : Spanner.float(setVideoSize),
      episodeDraftSeasonIdEq: episodeDraftSeasonIdEq,
      episodeDraftEpisodeIdEq: episodeDraftEpisodeIdEq,
    },
    types: {
      setVideoState: { type: "float64" },
      setResumableVideoUpload: { type: "bytes" },
      setVideoUploadedTimestamp: { type: "timestamp" },
      setVideoDuration: { type: "float64" },
      setVideoSize: { type: "float64" },
      episodeDraftSeasonIdEq: { type: "string" },
      episodeDraftEpisodeIdEq: { type: "string" },
    }
  };
}

export function updateEpisodeIndexStatement(
  setIndex: number,
  episodeSeasonIdEq: string,
  episodeEpisodeIdEq: string,
): Statement {
  return {
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
  };
}

export function updateVideoFileStatement(
  setUsed: boolean,
  videoFileFilenameEq: string,
): Statement {
  return {
    sql: "UPDATE VideoFile SET used = @setUsed WHERE VideoFile.filename = @videoFileFilenameEq",
    params: {
      setUsed: setUsed,
      videoFileFilenameEq: videoFileFilenameEq,
    },
    types: {
      setUsed: { type: "bool" },
      videoFileFilenameEq: { type: "string" },
    }
  };
}

export function deleteSeasonStatement(
  seasonSeasonIdEq: string,
): Statement {
  return {
    sql: "DELETE Season WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: seasonSeasonIdEq,
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
    }
  };
}

export function deleteEpisodeDraftStatement(
  episodeDraftSeasonIdEq: string,
  episodeDraftEpisodeIdEq: string,
): Statement {
  return {
    sql: "DELETE EpisodeDraft WHERE (EpisodeDraft.seasonId = @episodeDraftSeasonIdEq AND EpisodeDraft.episodeId = @episodeDraftEpisodeIdEq)",
    params: {
      episodeDraftSeasonIdEq: episodeDraftSeasonIdEq,
      episodeDraftEpisodeIdEq: episodeDraftEpisodeIdEq,
    },
    types: {
      episodeDraftSeasonIdEq: { type: "string" },
      episodeDraftEpisodeIdEq: { type: "string" },
    }
  };
}

export function deleteAllEpisodeDraftsStatement(
  episodeDraftSeasonIdEq: string,
): Statement {
  return {
    sql: "DELETE EpisodeDraft WHERE EpisodeDraft.seasonId = @episodeDraftSeasonIdEq",
    params: {
      episodeDraftSeasonIdEq: episodeDraftSeasonIdEq,
    },
    types: {
      episodeDraftSeasonIdEq: { type: "string" },
    }
  };
}

export function deleteEpisodeStatement(
  episodeSeasonIdEq: string,
  episodeEpisodeIdEq: string,
): Statement {
  return {
    sql: "DELETE Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
      episodeEpisodeIdEq: episodeEpisodeIdEq,
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
    }
  };
}

export function deleteAllEpisodesStatement(
  episodeSeasonIdEq: string,
): Statement {
  return {
    sql: "DELETE Episode WHERE Episode.seasonId = @episodeSeasonIdEq",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
    }
  };
}

export function deleteDeletingCoverImageFileStatement(
  deletingCoverImageFileFilenameEq: string,
): Statement {
  return {
    sql: "DELETE DeletingCoverImageFile WHERE DeletingCoverImageFile.filename = @deletingCoverImageFileFilenameEq",
    params: {
      deletingCoverImageFileFilenameEq: deletingCoverImageFileFilenameEq,
    },
    types: {
      deletingCoverImageFileFilenameEq: { type: "string" },
    }
  };
}

export function deleteVideoFileStatement(
  videoFileFilenameEq: string,
): Statement {
  return {
    sql: "DELETE VideoFile WHERE VideoFile.filename = @videoFileFilenameEq",
    params: {
      videoFileFilenameEq: videoFileFilenameEq,
    },
    types: {
      videoFileFilenameEq: { type: "string" },
    }
  };
}
