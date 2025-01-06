import { Statement } from '@google-cloud/spanner/build/src/transaction';
import { SeasonState } from '@phading/product_service_interface/show/season_state';
import { Spanner, Database, Transaction } from '@google-cloud/spanner';
import { Season, SEASON, SeasonMore, SEASON_MORE, SeasonGrade, SEASON_GRADE, Episode, EPISODE } from './schema';
import { serializeMessage, deserializeMessage } from '@selfage/message/serializer';
import { MessageDescriptor, PrimitiveType } from '@selfage/message/descriptor';

export function insertSeasonStatement(
  data: Season,
): Statement {
  return insertSeasonInternalStatement(
    data.seasonId,
    data.publisherId,
    data.state,
    data.lastChangeTimeMs,
    data
  );
}

export function insertSeasonInternalStatement(
  seasonId: string,
  publisherId: string,
  state: SeasonState,
  lastChangeTimeMs: number,
  data: Season,
): Statement {
  return {
    sql: "INSERT Season (seasonId, publisherId, state, lastChangeTimeMs, data) VALUES (@seasonId, @publisherId, @state, @lastChangeTimeMs, @data)",
    params: {
      seasonId: seasonId,
      publisherId: publisherId,
      state: Spanner.float(state),
      lastChangeTimeMs: Spanner.float(lastChangeTimeMs),
      data: Buffer.from(serializeMessage(data, SEASON).buffer),
    },
    types: {
      seasonId: { type: "string" },
      publisherId: { type: "string" },
      state: { type: "float64" },
      lastChangeTimeMs: { type: "float64" },
      data: { type: "bytes" },
    }
  };
}

export function deleteSeasonStatement(
  seasonSeasonIdEq: string,
): Statement {
  return {
    sql: "DELETE Season WHERE (Season.seasonId = @seasonSeasonIdEq)",
    params: {
      seasonSeasonIdEq: seasonSeasonIdEq,
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
    }
  };
}

export interface GetSeasonRow {
  seasonData: Season,
}

export let GET_SEASON_ROW: MessageDescriptor<GetSeasonRow> = {
  name: 'GetSeasonRow',
  fields: [{
    name: 'seasonData',
    index: 1,
    messageType: SEASON,
  }],
};

export async function getSeason(
  runner: Database | Transaction,
  seasonSeasonIdEq: string,
): Promise<Array<GetSeasonRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.data FROM Season WHERE (Season.seasonId = @seasonSeasonIdEq)",
    params: {
      seasonSeasonIdEq: seasonSeasonIdEq,
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonRow>();
  for (let row of rows) {
    resRows.push({
      seasonData: deserializeMessage(row.at(0).value, SEASON),
    });
  }
  return resRows;
}

export function updateSeasonStatement(
  data: Season,
): Statement {
  return updateSeasonInternalStatement(
    data.seasonId,
    data.publisherId,
    data.state,
    data.lastChangeTimeMs,
    data
  );
}

export function updateSeasonInternalStatement(
  seasonSeasonIdEq: string,
  setPublisherId: string,
  setState: SeasonState,
  setLastChangeTimeMs: number,
  setData: Season,
): Statement {
  return {
    sql: "UPDATE Season SET publisherId = @setPublisherId, state = @setState, lastChangeTimeMs = @setLastChangeTimeMs, data = @setData WHERE (Season.seasonId = @seasonSeasonIdEq)",
    params: {
      seasonSeasonIdEq: seasonSeasonIdEq,
      setPublisherId: setPublisherId,
      setState: Spanner.float(setState),
      setLastChangeTimeMs: Spanner.float(setLastChangeTimeMs),
      setData: Buffer.from(serializeMessage(setData, SEASON).buffer),
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
      setPublisherId: { type: "string" },
      setState: { type: "float64" },
      setLastChangeTimeMs: { type: "float64" },
      setData: { type: "bytes" },
    }
  };
}

export function insertSeasonMoreStatement(
  data: SeasonMore,
): Statement {
  return insertSeasonMoreInternalStatement(
    data.seasonId,
    data
  );
}

export function insertSeasonMoreInternalStatement(
  seasonId: string,
  data: SeasonMore,
): Statement {
  return {
    sql: "INSERT SeasonMore (seasonId, data) VALUES (@seasonId, @data)",
    params: {
      seasonId: seasonId,
      data: Buffer.from(serializeMessage(data, SEASON_MORE).buffer),
    },
    types: {
      seasonId: { type: "string" },
      data: { type: "bytes" },
    }
  };
}

export function deleteSeasonMoreStatement(
  seasonMoreSeasonIdEq: string,
): Statement {
  return {
    sql: "DELETE SeasonMore WHERE (SeasonMore.seasonId = @seasonMoreSeasonIdEq)",
    params: {
      seasonMoreSeasonIdEq: seasonMoreSeasonIdEq,
    },
    types: {
      seasonMoreSeasonIdEq: { type: "string" },
    }
  };
}

export interface GetSeasonMoreRow {
  seasonMoreData: SeasonMore,
}

export let GET_SEASON_MORE_ROW: MessageDescriptor<GetSeasonMoreRow> = {
  name: 'GetSeasonMoreRow',
  fields: [{
    name: 'seasonMoreData',
    index: 1,
    messageType: SEASON_MORE,
  }],
};

export async function getSeasonMore(
  runner: Database | Transaction,
  seasonMoreSeasonIdEq: string,
): Promise<Array<GetSeasonMoreRow>> {
  let [rows] = await runner.run({
    sql: "SELECT SeasonMore.data FROM SeasonMore WHERE (SeasonMore.seasonId = @seasonMoreSeasonIdEq)",
    params: {
      seasonMoreSeasonIdEq: seasonMoreSeasonIdEq,
    },
    types: {
      seasonMoreSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonMoreRow>();
  for (let row of rows) {
    resRows.push({
      seasonMoreData: deserializeMessage(row.at(0).value, SEASON_MORE),
    });
  }
  return resRows;
}

export function updateSeasonMoreStatement(
  data: SeasonMore,
): Statement {
  return updateSeasonMoreInternalStatement(
    data.seasonId,
    data
  );
}

export function updateSeasonMoreInternalStatement(
  seasonMoreSeasonIdEq: string,
  setData: SeasonMore,
): Statement {
  return {
    sql: "UPDATE SeasonMore SET data = @setData WHERE (SeasonMore.seasonId = @seasonMoreSeasonIdEq)",
    params: {
      seasonMoreSeasonIdEq: seasonMoreSeasonIdEq,
      setData: Buffer.from(serializeMessage(setData, SEASON_MORE).buffer),
    },
    types: {
      seasonMoreSeasonIdEq: { type: "string" },
      setData: { type: "bytes" },
    }
  };
}

export function insertSeasonGradeStatement(
  data: SeasonGrade,
): Statement {
  return insertSeasonGradeInternalStatement(
    data.seasonId,
    data.gradeId,
    data.startDate,
    data.endDate,
    data
  );
}

export function insertSeasonGradeInternalStatement(
  seasonId: string,
  gradeId: string,
  startDate: string,
  endDate: string,
  data: SeasonGrade,
): Statement {
  return {
    sql: "INSERT SeasonGrade (seasonId, gradeId, startDate, endDate, data) VALUES (@seasonId, @gradeId, @startDate, @endDate, @data)",
    params: {
      seasonId: seasonId,
      gradeId: gradeId,
      startDate: startDate,
      endDate: endDate,
      data: Buffer.from(serializeMessage(data, SEASON_GRADE).buffer),
    },
    types: {
      seasonId: { type: "string" },
      gradeId: { type: "string" },
      startDate: { type: "string" },
      endDate: { type: "string" },
      data: { type: "bytes" },
    }
  };
}

export function updateSeasonGradeStatement(
  data: SeasonGrade,
): Statement {
  return updateSeasonGradeInternalStatement(
    data.seasonId,
    data.gradeId,
    data.startDate,
    data.endDate,
    data
  );
}

export function updateSeasonGradeInternalStatement(
  seasonGradeSeasonIdEq: string,
  seasonGradeGradeIdEq: string,
  setStartDate: string,
  setEndDate: string,
  setData: SeasonGrade,
): Statement {
  return {
    sql: "UPDATE SeasonGrade SET startDate = @setStartDate, endDate = @setEndDate, data = @setData WHERE (SeasonGrade.seasonId = @seasonGradeSeasonIdEq AND SeasonGrade.gradeId = @seasonGradeGradeIdEq)",
    params: {
      seasonGradeSeasonIdEq: seasonGradeSeasonIdEq,
      seasonGradeGradeIdEq: seasonGradeGradeIdEq,
      setStartDate: setStartDate,
      setEndDate: setEndDate,
      setData: Buffer.from(serializeMessage(setData, SEASON_GRADE).buffer),
    },
    types: {
      seasonGradeSeasonIdEq: { type: "string" },
      seasonGradeGradeIdEq: { type: "string" },
      setStartDate: { type: "string" },
      setEndDate: { type: "string" },
      setData: { type: "bytes" },
    }
  };
}

export function insertEpisodeStatement(
  data: Episode,
): Statement {
  return insertEpisodeInternalStatement(
    data.seasonId,
    data.episodeId,
    data.index,
    data.publishTimeMs,
    data
  );
}

export function insertEpisodeInternalStatement(
  seasonId: string,
  episodeId: string,
  index: number,
  publishTimeMs: number,
  data: Episode,
): Statement {
  return {
    sql: "INSERT Episode (seasonId, episodeId, index, publishTimeMs, data) VALUES (@seasonId, @episodeId, @index, @publishTimeMs, @data)",
    params: {
      seasonId: seasonId,
      episodeId: episodeId,
      index: Spanner.float(index),
      publishTimeMs: Spanner.float(publishTimeMs),
      data: Buffer.from(serializeMessage(data, EPISODE).buffer),
    },
    types: {
      seasonId: { type: "string" },
      episodeId: { type: "string" },
      index: { type: "float64" },
      publishTimeMs: { type: "float64" },
      data: { type: "bytes" },
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

export interface GetEpisodeRow {
  episodeData: Episode,
}

export let GET_EPISODE_ROW: MessageDescriptor<GetEpisodeRow> = {
  name: 'GetEpisodeRow',
  fields: [{
    name: 'episodeData',
    index: 1,
    messageType: EPISODE,
  }],
};

export async function getEpisode(
  runner: Database | Transaction,
  episodeSeasonIdEq: string,
  episodeEpisodeIdEq: string,
): Promise<Array<GetEpisodeRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Episode.data FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
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
      episodeData: deserializeMessage(row.at(0).value, EPISODE),
    });
  }
  return resRows;
}

export function updateEpisodeStatement(
  data: Episode,
): Statement {
  return updateEpisodeInternalStatement(
    data.seasonId,
    data.episodeId,
    data.index,
    data.publishTimeMs,
    data
  );
}

export function updateEpisodeInternalStatement(
  episodeSeasonIdEq: string,
  episodeEpisodeIdEq: string,
  setIndex: number,
  setPublishTimeMs: number,
  setData: Episode,
): Statement {
  return {
    sql: "UPDATE Episode SET index = @setIndex, publishTimeMs = @setPublishTimeMs, data = @setData WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
      episodeEpisodeIdEq: episodeEpisodeIdEq,
      setIndex: Spanner.float(setIndex),
      setPublishTimeMs: Spanner.float(setPublishTimeMs),
      setData: Buffer.from(serializeMessage(setData, EPISODE).buffer),
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
      setIndex: { type: "float64" },
      setPublishTimeMs: { type: "float64" },
      setData: { type: "bytes" },
    }
  };
}

export function insertCoverImageFileStatement(
  r2Filename: string,
): Statement {
  return {
    sql: "INSERT CoverImageFile (r2Filename) VALUES (@r2Filename)",
    params: {
      r2Filename: r2Filename,
    },
    types: {
      r2Filename: { type: "string" },
    }
  };
}

export function insertVideoContainerKeyStatement(
  key: string,
): Statement {
  return {
    sql: "INSERT VideoContainerKey (key) VALUES (@key)",
    params: {
      key: key,
    },
    types: {
      key: { type: "string" },
    }
  };
}

export function insertVideoContainerCreatingTaskStatement(
  seasonId: string,
  episodeId: string,
  executionTimeMs: number,
  createdTimeMs: number,
): Statement {
  return {
    sql: "INSERT VideoContainerCreatingTask (seasonId, episodeId, executionTimeMs, createdTimeMs) VALUES (@seasonId, @episodeId, @executionTimeMs, @createdTimeMs)",
    params: {
      seasonId: seasonId,
      episodeId: episodeId,
      executionTimeMs: new Date(executionTimeMs).toISOString(),
      createdTimeMs: new Date(createdTimeMs).toISOString(),
    },
    types: {
      seasonId: { type: "string" },
      episodeId: { type: "string" },
      executionTimeMs: { type: "timestamp" },
      createdTimeMs: { type: "timestamp" },
    }
  };
}

export function insertVideoContainerDeletingTaskStatement(
  videoContainerId: string,
  executionTimeMs: number,
  createdTimeMs: number,
): Statement {
  return {
    sql: "INSERT VideoContainerDeletingTask (videoContainerId, executionTimeMs, createdTimeMs) VALUES (@videoContainerId, @executionTimeMs, @createdTimeMs)",
    params: {
      videoContainerId: videoContainerId,
      executionTimeMs: new Date(executionTimeMs).toISOString(),
      createdTimeMs: new Date(createdTimeMs).toISOString(),
    },
    types: {
      videoContainerId: { type: "string" },
      executionTimeMs: { type: "timestamp" },
      createdTimeMs: { type: "timestamp" },
    }
  };
}

export function insertCoverImageDeletingTaskStatement(
  r2Filename: string,
  executionTimeMs: number,
  createdTimeMs: number,
): Statement {
  return {
    sql: "INSERT CoverImageDeletingTask (r2Filename, executionTimeMs, createdTimeMs) VALUES (@r2Filename, @executionTimeMs, @createdTimeMs)",
    params: {
      r2Filename: r2Filename,
      executionTimeMs: new Date(executionTimeMs).toISOString(),
      createdTimeMs: new Date(createdTimeMs).toISOString(),
    },
    types: {
      r2Filename: { type: "string" },
      executionTimeMs: { type: "timestamp" },
      createdTimeMs: { type: "timestamp" },
    }
  };
}

export function updateVideoContainerCreatingTaskStatement(
  videoContainerCreatingTaskSeasonIdEq: string,
  videoContainerCreatingTaskEpisodeIdEq: string,
  setExecutionTimeMs: number,
): Statement {
  return {
    sql: "UPDATE VideoContainerCreatingTask SET executionTimeMs = @setExecutionTimeMs WHERE (VideoContainerCreatingTask.seasonId = @videoContainerCreatingTaskSeasonIdEq AND VideoContainerCreatingTask.episodeId = @videoContainerCreatingTaskEpisodeIdEq)",
    params: {
      videoContainerCreatingTaskSeasonIdEq: videoContainerCreatingTaskSeasonIdEq,
      videoContainerCreatingTaskEpisodeIdEq: videoContainerCreatingTaskEpisodeIdEq,
      setExecutionTimeMs: new Date(setExecutionTimeMs).toISOString(),
    },
    types: {
      videoContainerCreatingTaskSeasonIdEq: { type: "string" },
      videoContainerCreatingTaskEpisodeIdEq: { type: "string" },
      setExecutionTimeMs: { type: "timestamp" },
    }
  };
}

export function updateVideoContainerDeletingTaskStatement(
  videoContainerDeletingTaskVideoContainerIdEq: string,
  setExecutionTimeMs: number,
): Statement {
  return {
    sql: "UPDATE VideoContainerDeletingTask SET executionTimeMs = @setExecutionTimeMs WHERE VideoContainerDeletingTask.videoContainerId = @videoContainerDeletingTaskVideoContainerIdEq",
    params: {
      videoContainerDeletingTaskVideoContainerIdEq: videoContainerDeletingTaskVideoContainerIdEq,
      setExecutionTimeMs: new Date(setExecutionTimeMs).toISOString(),
    },
    types: {
      videoContainerDeletingTaskVideoContainerIdEq: { type: "string" },
      setExecutionTimeMs: { type: "timestamp" },
    }
  };
}

export function updateCoverImageDeletingTaskStatement(
  coverImageDeletingTaskR2FilenameEq: string,
  setExecutionTimeMs: number,
): Statement {
  return {
    sql: "UPDATE CoverImageDeletingTask SET executionTimeMs = @setExecutionTimeMs WHERE CoverImageDeletingTask.r2Filename = @coverImageDeletingTaskR2FilenameEq",
    params: {
      coverImageDeletingTaskR2FilenameEq: coverImageDeletingTaskR2FilenameEq,
      setExecutionTimeMs: new Date(setExecutionTimeMs).toISOString(),
    },
    types: {
      coverImageDeletingTaskR2FilenameEq: { type: "string" },
      setExecutionTimeMs: { type: "timestamp" },
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

export function deleteCoverImageFileStatement(
  coverImageFileR2FilenameEq: string,
): Statement {
  return {
    sql: "DELETE CoverImageFile WHERE CoverImageFile.r2Filename = @coverImageFileR2FilenameEq",
    params: {
      coverImageFileR2FilenameEq: coverImageFileR2FilenameEq,
    },
    types: {
      coverImageFileR2FilenameEq: { type: "string" },
    }
  };
}

export function deleteVideoContainerKeyStatement(
  videoContainerKeyKeyEq: string,
): Statement {
  return {
    sql: "DELETE VideoContainerKey WHERE VideoContainerKey.key = @videoContainerKeyKeyEq",
    params: {
      videoContainerKeyKeyEq: videoContainerKeyKeyEq,
    },
    types: {
      videoContainerKeyKeyEq: { type: "string" },
    }
  };
}

export function deleteVideoContainerCreatingTaskStatement(
  videoContainerCreatingTaskSeasonIdEq: string,
  videoContainerCreatingTaskEpisodeIdEq: string,
): Statement {
  return {
    sql: "DELETE VideoContainerCreatingTask WHERE (VideoContainerCreatingTask.seasonId = @videoContainerCreatingTaskSeasonIdEq AND VideoContainerCreatingTask.episodeId = @videoContainerCreatingTaskEpisodeIdEq)",
    params: {
      videoContainerCreatingTaskSeasonIdEq: videoContainerCreatingTaskSeasonIdEq,
      videoContainerCreatingTaskEpisodeIdEq: videoContainerCreatingTaskEpisodeIdEq,
    },
    types: {
      videoContainerCreatingTaskSeasonIdEq: { type: "string" },
      videoContainerCreatingTaskEpisodeIdEq: { type: "string" },
    }
  };
}

export function deleteVideoContainerDeletingTaskStatement(
  videoContainerDeletingTaskVideoContainerIdEq: string,
): Statement {
  return {
    sql: "DELETE VideoContainerDeletingTask WHERE VideoContainerDeletingTask.videoContainerId = @videoContainerDeletingTaskVideoContainerIdEq",
    params: {
      videoContainerDeletingTaskVideoContainerIdEq: videoContainerDeletingTaskVideoContainerIdEq,
    },
    types: {
      videoContainerDeletingTaskVideoContainerIdEq: { type: "string" },
    }
  };
}

export function deleteCoverImageDeletingTaskStatement(
  coverImageDeletingTaskR2FilenameEq: string,
): Statement {
  return {
    sql: "DELETE CoverImageDeletingTask WHERE CoverImageDeletingTask.r2Filename = @coverImageDeletingTaskR2FilenameEq",
    params: {
      coverImageDeletingTaskR2FilenameEq: coverImageDeletingTaskR2FilenameEq,
    },
    types: {
      coverImageDeletingTaskR2FilenameEq: { type: "string" },
    }
  };
}

export interface GetSeasonPublisherRow {
  seasonPublisherId: string,
}

export let GET_SEASON_PUBLISHER_ROW: MessageDescriptor<GetSeasonPublisherRow> = {
  name: 'GetSeasonPublisherRow',
  fields: [{
    name: 'seasonPublisherId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }],
};

export async function getSeasonPublisher(
  runner: Database | Transaction,
  seasonSeasonIdEq: string,
): Promise<Array<GetSeasonPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.publisherId FROM Season WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: seasonSeasonIdEq,
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonPublisherRow>();
  for (let row of rows) {
    resRows.push({
      seasonPublisherId: row.at(0).value,
    });
  }
  return resRows;
}

export interface GetSeasonForPublisherRow {
  seasonData: Season,
}

export let GET_SEASON_FOR_PUBLISHER_ROW: MessageDescriptor<GetSeasonForPublisherRow> = {
  name: 'GetSeasonForPublisherRow',
  fields: [{
    name: 'seasonData',
    index: 1,
    messageType: SEASON,
  }],
};

export async function getSeasonForPublisher(
  runner: Database | Transaction,
  seasonPublisherIdEq: string,
  seasonSeasonIdEq: string,
): Promise<Array<GetSeasonForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.data FROM Season WHERE (Season.publisherId = @seasonPublisherIdEq AND Season.seasonId = @seasonSeasonIdEq)",
    params: {
      seasonPublisherIdEq: seasonPublisherIdEq,
      seasonSeasonIdEq: seasonSeasonIdEq,
    },
    types: {
      seasonPublisherIdEq: { type: "string" },
      seasonSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonForPublisherRow>();
  for (let row of rows) {
    resRows.push({
      seasonData: deserializeMessage(row.at(0).value, SEASON),
    });
  }
  return resRows;
}

export interface GetPublishedSeasonAndMoreForConsumerRow {
  sData: Season,
  mData: SeasonMore,
}

export let GET_PUBLISHED_SEASON_AND_MORE_FOR_CONSUMER_ROW: MessageDescriptor<GetPublishedSeasonAndMoreForConsumerRow> = {
  name: 'GetPublishedSeasonAndMoreForConsumerRow',
  fields: [{
    name: 'sData',
    index: 1,
    messageType: SEASON,
  }, {
    name: 'mData',
    index: 2,
    messageType: SEASON_MORE,
  }],
};

export async function getPublishedSeasonAndMoreForConsumer(
  runner: Database | Transaction,
  sSeasonIdEq: string,
  sStateEq: SeasonState,
): Promise<Array<GetPublishedSeasonAndMoreForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT s.data, m.data FROM Season AS s INNER JOIN SeasonMore AS m ON s.seasonId = m.seasonId WHERE (s.seasonId = @sSeasonIdEq AND s.state = @sStateEq)",
    params: {
      sSeasonIdEq: sSeasonIdEq,
      sStateEq: Spanner.float(sStateEq),
    },
    types: {
      sSeasonIdEq: { type: "string" },
      sStateEq: { type: "float64" },
    }
  });
  let resRows = new Array<GetPublishedSeasonAndMoreForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      sData: deserializeMessage(row.at(0).value, SEASON),
      mData: deserializeMessage(row.at(1).value, SEASON_MORE),
    });
  }
  return resRows;
}

export interface GetSeasonAndMoreForPublisherRow {
  sData: Season,
  mData: SeasonMore,
}

export let GET_SEASON_AND_MORE_FOR_PUBLISHER_ROW: MessageDescriptor<GetSeasonAndMoreForPublisherRow> = {
  name: 'GetSeasonAndMoreForPublisherRow',
  fields: [{
    name: 'sData',
    index: 1,
    messageType: SEASON,
  }, {
    name: 'mData',
    index: 2,
    messageType: SEASON_MORE,
  }],
};

export async function getSeasonAndMoreForPublisher(
  runner: Database | Transaction,
  sPublisherIdEq: string,
  sSeasonIdEq: string,
): Promise<Array<GetSeasonAndMoreForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT s.data, m.data FROM Season AS s INNER JOIN SeasonMore AS m ON s.seasonId = m.seasonId WHERE (s.publisherId = @sPublisherIdEq AND s.seasonId = @sSeasonIdEq)",
    params: {
      sPublisherIdEq: sPublisherIdEq,
      sSeasonIdEq: sSeasonIdEq,
    },
    types: {
      sPublisherIdEq: { type: "string" },
      sSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonAndMoreForPublisherRow>();
  for (let row of rows) {
    resRows.push({
      sData: deserializeMessage(row.at(0).value, SEASON),
      mData: deserializeMessage(row.at(1).value, SEASON_MORE),
    });
  }
  return resRows;
}

export interface ListSeasonsForPublisherRow {
  seasonData: Season,
}

export let LIST_SEASONS_FOR_PUBLISHER_ROW: MessageDescriptor<ListSeasonsForPublisherRow> = {
  name: 'ListSeasonsForPublisherRow',
  fields: [{
    name: 'seasonData',
    index: 1,
    messageType: SEASON,
  }],
};

export async function listSeasonsForPublisher(
  runner: Database | Transaction,
  seasonPublisherIdEq: string,
  seasonStateEq: SeasonState,
  seasonLastChangeTimeMsLt: number,
  limit: number,
): Promise<Array<ListSeasonsForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.data FROM Season WHERE (Season.publisherId = @seasonPublisherIdEq AND Season.state = @seasonStateEq AND Season.lastChangeTimeMs < @seasonLastChangeTimeMsLt) ORDER BY Season.lastChangeTimeMs DESC LIMIT @limit",
    params: {
      seasonPublisherIdEq: seasonPublisherIdEq,
      seasonStateEq: Spanner.float(seasonStateEq),
      seasonLastChangeTimeMsLt: Spanner.float(seasonLastChangeTimeMsLt),
      limit: limit.toString(),
    },
    types: {
      seasonPublisherIdEq: { type: "string" },
      seasonStateEq: { type: "float64" },
      seasonLastChangeTimeMsLt: { type: "float64" },
      limit: { type: "int64" },
    }
  });
  let resRows = new Array<ListSeasonsForPublisherRow>();
  for (let row of rows) {
    resRows.push({
      seasonData: deserializeMessage(row.at(0).value, SEASON),
    });
  }
  return resRows;
}

export interface GetSeasonGradeRow {
  seasonGradeData: SeasonGrade,
}

export let GET_SEASON_GRADE_ROW: MessageDescriptor<GetSeasonGradeRow> = {
  name: 'GetSeasonGradeRow',
  fields: [{
    name: 'seasonGradeData',
    index: 1,
    messageType: SEASON_GRADE,
  }],
};

export async function getSeasonGrade(
  runner: Database | Transaction,
  seasonGradeSeasonIdEq: string,
  seasonGradeStartDateLe: string,
  seasonGradeEndDateGt: string,
): Promise<Array<GetSeasonGradeRow>> {
  let [rows] = await runner.run({
    sql: "SELECT SeasonGrade.data FROM SeasonGrade WHERE (SeasonGrade.seasonId = @seasonGradeSeasonIdEq AND SeasonGrade.startDate <= @seasonGradeStartDateLe AND SeasonGrade.endDate > @seasonGradeEndDateGt)",
    params: {
      seasonGradeSeasonIdEq: seasonGradeSeasonIdEq,
      seasonGradeStartDateLe: seasonGradeStartDateLe,
      seasonGradeEndDateGt: seasonGradeEndDateGt,
    },
    types: {
      seasonGradeSeasonIdEq: { type: "string" },
      seasonGradeStartDateLe: { type: "string" },
      seasonGradeEndDateGt: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonGradeRow>();
  for (let row of rows) {
    resRows.push({
      seasonGradeData: deserializeMessage(row.at(0).value, SEASON_GRADE),
    });
  }
  return resRows;
}

export interface GetLastSeasonGradesRow {
  seasonGradeData: SeasonGrade,
}

export let GET_LAST_SEASON_GRADES_ROW: MessageDescriptor<GetLastSeasonGradesRow> = {
  name: 'GetLastSeasonGradesRow',
  fields: [{
    name: 'seasonGradeData',
    index: 1,
    messageType: SEASON_GRADE,
  }],
};

export async function getLastSeasonGrades(
  runner: Database | Transaction,
  seasonGradeSeasonIdEq: string,
  seasonGradeEndDateGt: string,
  limit: number,
): Promise<Array<GetLastSeasonGradesRow>> {
  let [rows] = await runner.run({
    sql: "SELECT SeasonGrade.data FROM SeasonGrade WHERE (SeasonGrade.seasonId = @seasonGradeSeasonIdEq AND SeasonGrade.endDate > @seasonGradeEndDateGt) ORDER BY SeasonGrade.endDate DESC LIMIT @limit",
    params: {
      seasonGradeSeasonIdEq: seasonGradeSeasonIdEq,
      seasonGradeEndDateGt: seasonGradeEndDateGt,
      limit: limit.toString(),
    },
    types: {
      seasonGradeSeasonIdEq: { type: "string" },
      seasonGradeEndDateGt: { type: "string" },
      limit: { type: "int64" },
    }
  });
  let resRows = new Array<GetLastSeasonGradesRow>();
  for (let row of rows) {
    resRows.push({
      seasonGradeData: deserializeMessage(row.at(0).value, SEASON_GRADE),
    });
  }
  return resRows;
}

export interface GetPublishedEpisodeForConsumerRow {
  eData: Episode,
}

export let GET_PUBLISHED_EPISODE_FOR_CONSUMER_ROW: MessageDescriptor<GetPublishedEpisodeForConsumerRow> = {
  name: 'GetPublishedEpisodeForConsumerRow',
  fields: [{
    name: 'eData',
    index: 1,
    messageType: EPISODE,
  }],
};

export async function getPublishedEpisodeForConsumer(
  runner: Database | Transaction,
  eSeasonIdEq: string,
  sStateEq: SeasonState,
  eEpisodeIdEq: string,
  ePublishTimeMsLt: number,
): Promise<Array<GetPublishedEpisodeForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.data FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (e.seasonId = @eSeasonIdEq AND s.state = @sStateEq AND e.episodeId = @eEpisodeIdEq AND e.publishTimeMs < @ePublishTimeMsLt)",
    params: {
      eSeasonIdEq: eSeasonIdEq,
      sStateEq: Spanner.float(sStateEq),
      eEpisodeIdEq: eEpisodeIdEq,
      ePublishTimeMsLt: Spanner.float(ePublishTimeMsLt),
    },
    types: {
      eSeasonIdEq: { type: "string" },
      sStateEq: { type: "float64" },
      eEpisodeIdEq: { type: "string" },
      ePublishTimeMsLt: { type: "float64" },
    }
  });
  let resRows = new Array<GetPublishedEpisodeForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      eData: deserializeMessage(row.at(0).value, EPISODE),
    });
  }
  return resRows;
}

export interface ListNextPublishedEpisodesForConsumerRow {
  eData: Episode,
}

export let LIST_NEXT_PUBLISHED_EPISODES_FOR_CONSUMER_ROW: MessageDescriptor<ListNextPublishedEpisodesForConsumerRow> = {
  name: 'ListNextPublishedEpisodesForConsumerRow',
  fields: [{
    name: 'eData',
    index: 1,
    messageType: EPISODE,
  }],
};

export async function listNextPublishedEpisodesForConsumer(
  runner: Database | Transaction,
  eSeasonIdEq: string,
  sStateEq: SeasonState,
  eIndexGt: number,
  ePublishTimeMsLt: number,
  limit: number,
): Promise<Array<ListNextPublishedEpisodesForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.data FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (e.seasonId = @eSeasonIdEq AND s.state = @sStateEq AND e.index > @eIndexGt AND e.publishTimeMs < @ePublishTimeMsLt) ORDER BY e.index LIMIT @limit",
    params: {
      eSeasonIdEq: eSeasonIdEq,
      sStateEq: Spanner.float(sStateEq),
      eIndexGt: Spanner.float(eIndexGt),
      ePublishTimeMsLt: Spanner.float(ePublishTimeMsLt),
      limit: limit.toString(),
    },
    types: {
      eSeasonIdEq: { type: "string" },
      sStateEq: { type: "float64" },
      eIndexGt: { type: "float64" },
      ePublishTimeMsLt: { type: "float64" },
      limit: { type: "int64" },
    }
  });
  let resRows = new Array<ListNextPublishedEpisodesForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      eData: deserializeMessage(row.at(0).value, EPISODE),
    });
  }
  return resRows;
}

export interface ListPrevPublishedEpisodesForConsumerRow {
  eData: Episode,
}

export let LIST_PREV_PUBLISHED_EPISODES_FOR_CONSUMER_ROW: MessageDescriptor<ListPrevPublishedEpisodesForConsumerRow> = {
  name: 'ListPrevPublishedEpisodesForConsumerRow',
  fields: [{
    name: 'eData',
    index: 1,
    messageType: EPISODE,
  }],
};

export async function listPrevPublishedEpisodesForConsumer(
  runner: Database | Transaction,
  eSeasonIdEq: string,
  sStateEq: SeasonState,
  eIndexLt: number,
  ePublishTimeMsLt: number,
  limit: number,
): Promise<Array<ListPrevPublishedEpisodesForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.data FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (e.seasonId = @eSeasonIdEq AND s.state = @sStateEq AND e.index < @eIndexLt AND e.publishTimeMs < @ePublishTimeMsLt) ORDER BY e.index DESC LIMIT @limit",
    params: {
      eSeasonIdEq: eSeasonIdEq,
      sStateEq: Spanner.float(sStateEq),
      eIndexLt: Spanner.float(eIndexLt),
      ePublishTimeMsLt: Spanner.float(ePublishTimeMsLt),
      limit: limit.toString(),
    },
    types: {
      eSeasonIdEq: { type: "string" },
      sStateEq: { type: "float64" },
      eIndexLt: { type: "float64" },
      ePublishTimeMsLt: { type: "float64" },
      limit: { type: "int64" },
    }
  });
  let resRows = new Array<ListPrevPublishedEpisodesForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      eData: deserializeMessage(row.at(0).value, EPISODE),
    });
  }
  return resRows;
}

export interface ListPrevEpisodesForPublisherRow {
  eData: Episode,
}

export let LIST_PREV_EPISODES_FOR_PUBLISHER_ROW: MessageDescriptor<ListPrevEpisodesForPublisherRow> = {
  name: 'ListPrevEpisodesForPublisherRow',
  fields: [{
    name: 'eData',
    index: 1,
    messageType: EPISODE,
  }],
};

export async function listPrevEpisodesForPublisher(
  runner: Database | Transaction,
  sPublisherIdEq: string,
  eSeasonIdEq: string,
  eIndexLt: number,
  limit: number,
): Promise<Array<ListPrevEpisodesForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.data FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (s.publisherId = @sPublisherIdEq AND e.seasonId = @eSeasonIdEq AND e.index < @eIndexLt) ORDER BY e.index DESC LIMIT @limit",
    params: {
      sPublisherIdEq: sPublisherIdEq,
      eSeasonIdEq: eSeasonIdEq,
      eIndexLt: Spanner.float(eIndexLt),
      limit: limit.toString(),
    },
    types: {
      sPublisherIdEq: { type: "string" },
      eSeasonIdEq: { type: "string" },
      eIndexLt: { type: "float64" },
      limit: { type: "int64" },
    }
  });
  let resRows = new Array<ListPrevEpisodesForPublisherRow>();
  for (let row of rows) {
    resRows.push({
      eData: deserializeMessage(row.at(0).value, EPISODE),
    });
  }
  return resRows;
}

export interface ListNextEpisodesForPublisherRow {
  eData: Episode,
}

export let LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW: MessageDescriptor<ListNextEpisodesForPublisherRow> = {
  name: 'ListNextEpisodesForPublisherRow',
  fields: [{
    name: 'eData',
    index: 1,
    messageType: EPISODE,
  }],
};

export async function listNextEpisodesForPublisher(
  runner: Database | Transaction,
  sPublisherIdEq: string,
  eSeasonIdEq: string,
  eIndexGt: number,
  limit: number,
): Promise<Array<ListNextEpisodesForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.data FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (s.publisherId = @sPublisherIdEq AND e.seasonId = @eSeasonIdEq AND e.index > @eIndexGt) ORDER BY e.index LIMIT @limit",
    params: {
      sPublisherIdEq: sPublisherIdEq,
      eSeasonIdEq: eSeasonIdEq,
      eIndexGt: Spanner.float(eIndexGt),
      limit: limit.toString(),
    },
    types: {
      sPublisherIdEq: { type: "string" },
      eSeasonIdEq: { type: "string" },
      eIndexGt: { type: "float64" },
      limit: { type: "int64" },
    }
  });
  let resRows = new Array<ListNextEpisodesForPublisherRow>();
  for (let row of rows) {
    resRows.push({
      eData: deserializeMessage(row.at(0).value, EPISODE),
    });
  }
  return resRows;
}

export interface GetEpisodeForPublisherRow {
  eData: Episode,
}

export let GET_EPISODE_FOR_PUBLISHER_ROW: MessageDescriptor<GetEpisodeForPublisherRow> = {
  name: 'GetEpisodeForPublisherRow',
  fields: [{
    name: 'eData',
    index: 1,
    messageType: EPISODE,
  }],
};

export async function getEpisodeForPublisher(
  runner: Database | Transaction,
  sPublisherIdEq: string,
  eSeasonIdEq: string,
  eEpisodeIdEq: string,
): Promise<Array<GetEpisodeForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.data FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (s.publisherId = @sPublisherIdEq AND e.seasonId = @eSeasonIdEq AND e.episodeId = @eEpisodeIdEq)",
    params: {
      sPublisherIdEq: sPublisherIdEq,
      eSeasonIdEq: eSeasonIdEq,
      eEpisodeIdEq: eEpisodeIdEq,
    },
    types: {
      sPublisherIdEq: { type: "string" },
      eSeasonIdEq: { type: "string" },
      eEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetEpisodeForPublisherRow>();
  for (let row of rows) {
    resRows.push({
      eData: deserializeMessage(row.at(0).value, EPISODE),
    });
  }
  return resRows;
}

export interface GetSeasonAndEpisodeRow {
  sData: Season,
  eData: Episode,
}

export let GET_SEASON_AND_EPISODE_ROW: MessageDescriptor<GetSeasonAndEpisodeRow> = {
  name: 'GetSeasonAndEpisodeRow',
  fields: [{
    name: 'sData',
    index: 1,
    messageType: SEASON,
  }, {
    name: 'eData',
    index: 2,
    messageType: EPISODE,
  }],
};

export async function getSeasonAndEpisode(
  runner: Database | Transaction,
  eSeasonIdEq: string,
  eEpisodeIdEq: string,
): Promise<Array<GetSeasonAndEpisodeRow>> {
  let [rows] = await runner.run({
    sql: "SELECT s.data, e.data FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (e.seasonId = @eSeasonIdEq AND e.episodeId = @eEpisodeIdEq)",
    params: {
      eSeasonIdEq: eSeasonIdEq,
      eEpisodeIdEq: eEpisodeIdEq,
    },
    types: {
      eSeasonIdEq: { type: "string" },
      eEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonAndEpisodeRow>();
  for (let row of rows) {
    resRows.push({
      sData: deserializeMessage(row.at(0).value, SEASON),
      eData: deserializeMessage(row.at(1).value, EPISODE),
    });
  }
  return resRows;
}

export interface GetSeasonAndEpisodeForPublisherRow {
  sData: Season,
  eData: Episode,
}

export let GET_SEASON_AND_EPISODE_FOR_PUBLISHER_ROW: MessageDescriptor<GetSeasonAndEpisodeForPublisherRow> = {
  name: 'GetSeasonAndEpisodeForPublisherRow',
  fields: [{
    name: 'sData',
    index: 1,
    messageType: SEASON,
  }, {
    name: 'eData',
    index: 2,
    messageType: EPISODE,
  }],
};

export async function getSeasonAndEpisodeForPublisher(
  runner: Database | Transaction,
  sPublisherIdEq: string,
  eSeasonIdEq: string,
  eEpisodeIdEq: string,
): Promise<Array<GetSeasonAndEpisodeForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT s.data, e.data FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (s.publisherId = @sPublisherIdEq AND e.seasonId = @eSeasonIdEq AND e.episodeId = @eEpisodeIdEq)",
    params: {
      sPublisherIdEq: sPublisherIdEq,
      eSeasonIdEq: eSeasonIdEq,
      eEpisodeIdEq: eEpisodeIdEq,
    },
    types: {
      sPublisherIdEq: { type: "string" },
      eSeasonIdEq: { type: "string" },
      eEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonAndEpisodeForPublisherRow>();
  for (let row of rows) {
    resRows.push({
      sData: deserializeMessage(row.at(0).value, SEASON),
      eData: deserializeMessage(row.at(1).value, EPISODE),
    });
  }
  return resRows;
}

export interface CheckPresenceOfCoverImageFileRow {
  coverImageFileR2Filename: string,
}

export let CHECK_PRESENCE_OF_COVER_IMAGE_FILE_ROW: MessageDescriptor<CheckPresenceOfCoverImageFileRow> = {
  name: 'CheckPresenceOfCoverImageFileRow',
  fields: [{
    name: 'coverImageFileR2Filename',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }],
};

export async function checkPresenceOfCoverImageFile(
  runner: Database | Transaction,
  coverImageFileR2FilenameEq: string,
): Promise<Array<CheckPresenceOfCoverImageFileRow>> {
  let [rows] = await runner.run({
    sql: "SELECT CoverImageFile.r2Filename FROM CoverImageFile WHERE CoverImageFile.r2Filename = @coverImageFileR2FilenameEq",
    params: {
      coverImageFileR2FilenameEq: coverImageFileR2FilenameEq,
    },
    types: {
      coverImageFileR2FilenameEq: { type: "string" },
    }
  });
  let resRows = new Array<CheckPresenceOfCoverImageFileRow>();
  for (let row of rows) {
    resRows.push({
      coverImageFileR2Filename: row.at(0).value,
    });
  }
  return resRows;
}

export interface CheckPresenceOfVideoContainerKeyRow {
  videoContainerKeyKey: string,
}

export let CHECK_PRESENCE_OF_VIDEO_CONTAINER_KEY_ROW: MessageDescriptor<CheckPresenceOfVideoContainerKeyRow> = {
  name: 'CheckPresenceOfVideoContainerKeyRow',
  fields: [{
    name: 'videoContainerKeyKey',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }],
};

export async function checkPresenceOfVideoContainerKey(
  runner: Database | Transaction,
  videoContainerKeyKeyEq: string,
): Promise<Array<CheckPresenceOfVideoContainerKeyRow>> {
  let [rows] = await runner.run({
    sql: "SELECT VideoContainerKey.key FROM VideoContainerKey WHERE VideoContainerKey.key = @videoContainerKeyKeyEq",
    params: {
      videoContainerKeyKeyEq: videoContainerKeyKeyEq,
    },
    types: {
      videoContainerKeyKeyEq: { type: "string" },
    }
  });
  let resRows = new Array<CheckPresenceOfVideoContainerKeyRow>();
  for (let row of rows) {
    resRows.push({
      videoContainerKeyKey: row.at(0).value,
    });
  }
  return resRows;
}

export interface ListVideoContainerCreatingTasksRow {
  videoContainerCreatingTaskSeasonId: string,
  videoContainerCreatingTaskEpisodeId: string,
  videoContainerCreatingTaskExecutionTimeMs: number,
}

export let LIST_VIDEO_CONTAINER_CREATING_TASKS_ROW: MessageDescriptor<ListVideoContainerCreatingTasksRow> = {
  name: 'ListVideoContainerCreatingTasksRow',
  fields: [{
    name: 'videoContainerCreatingTaskSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'videoContainerCreatingTaskEpisodeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'videoContainerCreatingTaskExecutionTimeMs',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listVideoContainerCreatingTasks(
  runner: Database | Transaction,
  videoContainerCreatingTaskExecutionTimeMsLe: number,
): Promise<Array<ListVideoContainerCreatingTasksRow>> {
  let [rows] = await runner.run({
    sql: "SELECT VideoContainerCreatingTask.seasonId, VideoContainerCreatingTask.episodeId, VideoContainerCreatingTask.executionTimeMs FROM VideoContainerCreatingTask WHERE VideoContainerCreatingTask.executionTimeMs <= @videoContainerCreatingTaskExecutionTimeMsLe ORDER BY VideoContainerCreatingTask.executionTimeMs",
    params: {
      videoContainerCreatingTaskExecutionTimeMsLe: new Date(videoContainerCreatingTaskExecutionTimeMsLe).toISOString(),
    },
    types: {
      videoContainerCreatingTaskExecutionTimeMsLe: { type: "timestamp" },
    }
  });
  let resRows = new Array<ListVideoContainerCreatingTasksRow>();
  for (let row of rows) {
    resRows.push({
      videoContainerCreatingTaskSeasonId: row.at(0).value,
      videoContainerCreatingTaskEpisodeId: row.at(1).value,
      videoContainerCreatingTaskExecutionTimeMs: row.at(2).value.valueOf(),
    });
  }
  return resRows;
}

export interface ListVideoContainerDeletingTasksRow {
  videoContainerDeletingTaskVideoContainerId: string,
  videoContainerDeletingTaskExecutionTimeMs: number,
}

export let LIST_VIDEO_CONTAINER_DELETING_TASKS_ROW: MessageDescriptor<ListVideoContainerDeletingTasksRow> = {
  name: 'ListVideoContainerDeletingTasksRow',
  fields: [{
    name: 'videoContainerDeletingTaskVideoContainerId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'videoContainerDeletingTaskExecutionTimeMs',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listVideoContainerDeletingTasks(
  runner: Database | Transaction,
  videoContainerDeletingTaskExecutionTimeMsLe: number,
): Promise<Array<ListVideoContainerDeletingTasksRow>> {
  let [rows] = await runner.run({
    sql: "SELECT VideoContainerDeletingTask.videoContainerId, VideoContainerDeletingTask.executionTimeMs FROM VideoContainerDeletingTask WHERE VideoContainerDeletingTask.executionTimeMs <= @videoContainerDeletingTaskExecutionTimeMsLe ORDER BY VideoContainerDeletingTask.executionTimeMs",
    params: {
      videoContainerDeletingTaskExecutionTimeMsLe: new Date(videoContainerDeletingTaskExecutionTimeMsLe).toISOString(),
    },
    types: {
      videoContainerDeletingTaskExecutionTimeMsLe: { type: "timestamp" },
    }
  });
  let resRows = new Array<ListVideoContainerDeletingTasksRow>();
  for (let row of rows) {
    resRows.push({
      videoContainerDeletingTaskVideoContainerId: row.at(0).value,
      videoContainerDeletingTaskExecutionTimeMs: row.at(1).value.valueOf(),
    });
  }
  return resRows;
}

export interface ListCoverImageDeletingTasksRow {
  coverImageDeletingTaskR2Filename: string,
  coverImageDeletingTaskExecutionTimeMs: number,
}

export let LIST_COVER_IMAGE_DELETING_TASKS_ROW: MessageDescriptor<ListCoverImageDeletingTasksRow> = {
  name: 'ListCoverImageDeletingTasksRow',
  fields: [{
    name: 'coverImageDeletingTaskR2Filename',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'coverImageDeletingTaskExecutionTimeMs',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listCoverImageDeletingTasks(
  runner: Database | Transaction,
  coverImageDeletingTaskExecutionTimeMsLe: number,
): Promise<Array<ListCoverImageDeletingTasksRow>> {
  let [rows] = await runner.run({
    sql: "SELECT CoverImageDeletingTask.r2Filename, CoverImageDeletingTask.executionTimeMs FROM CoverImageDeletingTask WHERE CoverImageDeletingTask.executionTimeMs <= @coverImageDeletingTaskExecutionTimeMsLe ORDER BY CoverImageDeletingTask.executionTimeMs",
    params: {
      coverImageDeletingTaskExecutionTimeMsLe: new Date(coverImageDeletingTaskExecutionTimeMsLe).toISOString(),
    },
    types: {
      coverImageDeletingTaskExecutionTimeMsLe: { type: "timestamp" },
    }
  });
  let resRows = new Array<ListCoverImageDeletingTasksRow>();
  for (let row of rows) {
    resRows.push({
      coverImageDeletingTaskR2Filename: row.at(0).value,
      coverImageDeletingTaskExecutionTimeMs: row.at(1).value.valueOf(),
    });
  }
  return resRows;
}
