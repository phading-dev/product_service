import { Statement } from '@google-cloud/spanner/build/src/transaction';
import { SeasonState } from '@phading/product_service_interface/show/season_state';
import { Spanner, Database, Transaction } from '@google-cloud/spanner';
import { Season, SEASON, SeasonMore, SEASON_MORE, SeasonGrade, SEASON_GRADE, Episode, EPISODE, IndividualSeasonRating, INDIVIDUAL_SEASON_RATING, SeasonRating, SEASON_RATING } from './schema';
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
    data.recentPublishTimeMs,
    data
  );
}

export function insertSeasonInternalStatement(
  seasonId: string,
  publisherId: string,
  state: SeasonState,
  lastChangeTimeMs: number,
  recentPublishTimeMs: number,
  data: Season,
): Statement {
  return {
    sql: "INSERT Season (seasonId, publisherId, state, lastChangeTimeMs, recentPublishTimeMs, data) VALUES (@seasonId, @publisherId, @state, @lastChangeTimeMs, @recentPublishTimeMs, @data)",
    params: {
      seasonId: seasonId,
      publisherId: publisherId,
      state: Spanner.float(state),
      lastChangeTimeMs: Spanner.float(lastChangeTimeMs),
      recentPublishTimeMs: Spanner.float(recentPublishTimeMs),
      data: Buffer.from(serializeMessage(data, SEASON).buffer),
    },
    types: {
      seasonId: { type: "string" },
      publisherId: { type: "string" },
      state: { type: "float64" },
      lastChangeTimeMs: { type: "float64" },
      recentPublishTimeMs: { type: "float64" },
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
    data.recentPublishTimeMs,
    data
  );
}

export function updateSeasonInternalStatement(
  seasonSeasonIdEq: string,
  setPublisherId: string,
  setState: SeasonState,
  setLastChangeTimeMs: number,
  setRecentPublishTimeMs: number,
  setData: Season,
): Statement {
  return {
    sql: "UPDATE Season SET publisherId = @setPublisherId, state = @setState, lastChangeTimeMs = @setLastChangeTimeMs, recentPublishTimeMs = @setRecentPublishTimeMs, data = @setData WHERE (Season.seasonId = @seasonSeasonIdEq)",
    params: {
      seasonSeasonIdEq: seasonSeasonIdEq,
      setPublisherId: setPublisherId,
      setState: Spanner.float(setState),
      setLastChangeTimeMs: Spanner.float(setLastChangeTimeMs),
      setRecentPublishTimeMs: Spanner.float(setRecentPublishTimeMs),
      setData: Buffer.from(serializeMessage(setData, SEASON).buffer),
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
      setPublisherId: { type: "string" },
      setState: { type: "float64" },
      setLastChangeTimeMs: { type: "float64" },
      setRecentPublishTimeMs: { type: "float64" },
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

export function insertIndividualSeasonRatingStatement(
  data: IndividualSeasonRating,
): Statement {
  return insertIndividualSeasonRatingInternalStatement(
    data.raterId,
    data.seasonId,
    data
  );
}

export function insertIndividualSeasonRatingInternalStatement(
  raterId: string,
  seasonId: string,
  data: IndividualSeasonRating,
): Statement {
  return {
    sql: "INSERT IndividualSeasonRating (raterId, seasonId, data) VALUES (@raterId, @seasonId, @data)",
    params: {
      raterId: raterId,
      seasonId: seasonId,
      data: Buffer.from(serializeMessage(data, INDIVIDUAL_SEASON_RATING).buffer),
    },
    types: {
      raterId: { type: "string" },
      seasonId: { type: "string" },
      data: { type: "bytes" },
    }
  };
}

export function deleteIndividualSeasonRatingStatement(
  individualSeasonRatingRaterIdEq: string,
  individualSeasonRatingSeasonIdEq: string,
): Statement {
  return {
    sql: "DELETE IndividualSeasonRating WHERE (IndividualSeasonRating.raterId = @individualSeasonRatingRaterIdEq AND IndividualSeasonRating.seasonId = @individualSeasonRatingSeasonIdEq)",
    params: {
      individualSeasonRatingRaterIdEq: individualSeasonRatingRaterIdEq,
      individualSeasonRatingSeasonIdEq: individualSeasonRatingSeasonIdEq,
    },
    types: {
      individualSeasonRatingRaterIdEq: { type: "string" },
      individualSeasonRatingSeasonIdEq: { type: "string" },
    }
  };
}

export interface GetIndividualSeasonRatingRow {
  individualSeasonRatingData: IndividualSeasonRating,
}

export let GET_INDIVIDUAL_SEASON_RATING_ROW: MessageDescriptor<GetIndividualSeasonRatingRow> = {
  name: 'GetIndividualSeasonRatingRow',
  fields: [{
    name: 'individualSeasonRatingData',
    index: 1,
    messageType: INDIVIDUAL_SEASON_RATING,
  }],
};

export async function getIndividualSeasonRating(
  runner: Database | Transaction,
  individualSeasonRatingRaterIdEq: string,
  individualSeasonRatingSeasonIdEq: string,
): Promise<Array<GetIndividualSeasonRatingRow>> {
  let [rows] = await runner.run({
    sql: "SELECT IndividualSeasonRating.data FROM IndividualSeasonRating WHERE (IndividualSeasonRating.raterId = @individualSeasonRatingRaterIdEq AND IndividualSeasonRating.seasonId = @individualSeasonRatingSeasonIdEq)",
    params: {
      individualSeasonRatingRaterIdEq: individualSeasonRatingRaterIdEq,
      individualSeasonRatingSeasonIdEq: individualSeasonRatingSeasonIdEq,
    },
    types: {
      individualSeasonRatingRaterIdEq: { type: "string" },
      individualSeasonRatingSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetIndividualSeasonRatingRow>();
  for (let row of rows) {
    resRows.push({
      individualSeasonRatingData: deserializeMessage(row.at(0).value, INDIVIDUAL_SEASON_RATING),
    });
  }
  return resRows;
}

export function updateIndividualSeasonRatingStatement(
  data: IndividualSeasonRating,
): Statement {
  return updateIndividualSeasonRatingInternalStatement(
    data.raterId,
    data.seasonId,
    data
  );
}

export function updateIndividualSeasonRatingInternalStatement(
  individualSeasonRatingRaterIdEq: string,
  individualSeasonRatingSeasonIdEq: string,
  setData: IndividualSeasonRating,
): Statement {
  return {
    sql: "UPDATE IndividualSeasonRating SET data = @setData WHERE (IndividualSeasonRating.raterId = @individualSeasonRatingRaterIdEq AND IndividualSeasonRating.seasonId = @individualSeasonRatingSeasonIdEq)",
    params: {
      individualSeasonRatingRaterIdEq: individualSeasonRatingRaterIdEq,
      individualSeasonRatingSeasonIdEq: individualSeasonRatingSeasonIdEq,
      setData: Buffer.from(serializeMessage(setData, INDIVIDUAL_SEASON_RATING).buffer),
    },
    types: {
      individualSeasonRatingRaterIdEq: { type: "string" },
      individualSeasonRatingSeasonIdEq: { type: "string" },
      setData: { type: "bytes" },
    }
  };
}

export function insertSeasonRatingStatement(
  data: SeasonRating,
): Statement {
  return insertSeasonRatingInternalStatement(
    data.seasonId,
    data.averageRating,
    data.updatedTimeMs,
    data
  );
}

export function insertSeasonRatingInternalStatement(
  seasonId: string,
  averageRating: number,
  updatedTimeMs: number,
  data: SeasonRating,
): Statement {
  return {
    sql: "INSERT SeasonRating (seasonId, averageRating, updatedTimeMs, data) VALUES (@seasonId, @averageRating, @updatedTimeMs, @data)",
    params: {
      seasonId: seasonId,
      averageRating: Spanner.float(averageRating),
      updatedTimeMs: Spanner.float(updatedTimeMs),
      data: Buffer.from(serializeMessage(data, SEASON_RATING).buffer),
    },
    types: {
      seasonId: { type: "string" },
      averageRating: { type: "float64" },
      updatedTimeMs: { type: "float64" },
      data: { type: "bytes" },
    }
  };
}

export function deleteSeasonRatingStatement(
  seasonRatingSeasonIdEq: string,
): Statement {
  return {
    sql: "DELETE SeasonRating WHERE (SeasonRating.seasonId = @seasonRatingSeasonIdEq)",
    params: {
      seasonRatingSeasonIdEq: seasonRatingSeasonIdEq,
    },
    types: {
      seasonRatingSeasonIdEq: { type: "string" },
    }
  };
}

export interface GetSeasonRatingRow {
  seasonRatingData: SeasonRating,
}

export let GET_SEASON_RATING_ROW: MessageDescriptor<GetSeasonRatingRow> = {
  name: 'GetSeasonRatingRow',
  fields: [{
    name: 'seasonRatingData',
    index: 1,
    messageType: SEASON_RATING,
  }],
};

export async function getSeasonRating(
  runner: Database | Transaction,
  seasonRatingSeasonIdEq: string,
): Promise<Array<GetSeasonRatingRow>> {
  let [rows] = await runner.run({
    sql: "SELECT SeasonRating.data FROM SeasonRating WHERE (SeasonRating.seasonId = @seasonRatingSeasonIdEq)",
    params: {
      seasonRatingSeasonIdEq: seasonRatingSeasonIdEq,
    },
    types: {
      seasonRatingSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonRatingRow>();
  for (let row of rows) {
    resRows.push({
      seasonRatingData: deserializeMessage(row.at(0).value, SEASON_RATING),
    });
  }
  return resRows;
}

export function updateSeasonRatingStatement(
  data: SeasonRating,
): Statement {
  return updateSeasonRatingInternalStatement(
    data.seasonId,
    data.averageRating,
    data.updatedTimeMs,
    data
  );
}

export function updateSeasonRatingInternalStatement(
  seasonRatingSeasonIdEq: string,
  setAverageRating: number,
  setUpdatedTimeMs: number,
  setData: SeasonRating,
): Statement {
  return {
    sql: "UPDATE SeasonRating SET averageRating = @setAverageRating, updatedTimeMs = @setUpdatedTimeMs, data = @setData WHERE (SeasonRating.seasonId = @seasonRatingSeasonIdEq)",
    params: {
      seasonRatingSeasonIdEq: seasonRatingSeasonIdEq,
      setAverageRating: Spanner.float(setAverageRating),
      setUpdatedTimeMs: Spanner.float(setUpdatedTimeMs),
      setData: Buffer.from(serializeMessage(setData, SEASON_RATING).buffer),
    },
    types: {
      seasonRatingSeasonIdEq: { type: "string" },
      setAverageRating: { type: "float64" },
      setUpdatedTimeMs: { type: "float64" },
      setData: { type: "bytes" },
    }
  };
}

export function insertVideoContainerCreatingTaskStatement(
  seasonId: string,
  episodeId: string,
  retryCount: number,
  executionTimeMs: number,
  createdTimeMs: number,
): Statement {
  return {
    sql: "INSERT VideoContainerCreatingTask (seasonId, episodeId, retryCount, executionTimeMs, createdTimeMs) VALUES (@seasonId, @episodeId, @retryCount, @executionTimeMs, @createdTimeMs)",
    params: {
      seasonId: seasonId,
      episodeId: episodeId,
      retryCount: Spanner.float(retryCount),
      executionTimeMs: new Date(executionTimeMs).toISOString(),
      createdTimeMs: new Date(createdTimeMs).toISOString(),
    },
    types: {
      seasonId: { type: "string" },
      episodeId: { type: "string" },
      retryCount: { type: "float64" },
      executionTimeMs: { type: "timestamp" },
      createdTimeMs: { type: "timestamp" },
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

export interface GetVideoContainerCreatingTaskRow {
  videoContainerCreatingTaskSeasonId: string,
  videoContainerCreatingTaskEpisodeId: string,
  videoContainerCreatingTaskRetryCount: number,
  videoContainerCreatingTaskExecutionTimeMs: number,
  videoContainerCreatingTaskCreatedTimeMs: number,
}

export let GET_VIDEO_CONTAINER_CREATING_TASK_ROW: MessageDescriptor<GetVideoContainerCreatingTaskRow> = {
  name: 'GetVideoContainerCreatingTaskRow',
  fields: [{
    name: 'videoContainerCreatingTaskSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'videoContainerCreatingTaskEpisodeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'videoContainerCreatingTaskRetryCount',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'videoContainerCreatingTaskExecutionTimeMs',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'videoContainerCreatingTaskCreatedTimeMs',
    index: 5,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getVideoContainerCreatingTask(
  runner: Database | Transaction,
  videoContainerCreatingTaskSeasonIdEq: string,
  videoContainerCreatingTaskEpisodeIdEq: string,
): Promise<Array<GetVideoContainerCreatingTaskRow>> {
  let [rows] = await runner.run({
    sql: "SELECT VideoContainerCreatingTask.seasonId, VideoContainerCreatingTask.episodeId, VideoContainerCreatingTask.retryCount, VideoContainerCreatingTask.executionTimeMs, VideoContainerCreatingTask.createdTimeMs FROM VideoContainerCreatingTask WHERE (VideoContainerCreatingTask.seasonId = @videoContainerCreatingTaskSeasonIdEq AND VideoContainerCreatingTask.episodeId = @videoContainerCreatingTaskEpisodeIdEq)",
    params: {
      videoContainerCreatingTaskSeasonIdEq: videoContainerCreatingTaskSeasonIdEq,
      videoContainerCreatingTaskEpisodeIdEq: videoContainerCreatingTaskEpisodeIdEq,
    },
    types: {
      videoContainerCreatingTaskSeasonIdEq: { type: "string" },
      videoContainerCreatingTaskEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetVideoContainerCreatingTaskRow>();
  for (let row of rows) {
    resRows.push({
      videoContainerCreatingTaskSeasonId: row.at(0).value,
      videoContainerCreatingTaskEpisodeId: row.at(1).value,
      videoContainerCreatingTaskRetryCount: row.at(2).value.value,
      videoContainerCreatingTaskExecutionTimeMs: row.at(3).value.valueOf(),
      videoContainerCreatingTaskCreatedTimeMs: row.at(4).value.valueOf(),
    });
  }
  return resRows;
}

export interface ListPendingVideoContainerCreatingTasksRow {
  videoContainerCreatingTaskSeasonId: string,
  videoContainerCreatingTaskEpisodeId: string,
}

export let LIST_PENDING_VIDEO_CONTAINER_CREATING_TASKS_ROW: MessageDescriptor<ListPendingVideoContainerCreatingTasksRow> = {
  name: 'ListPendingVideoContainerCreatingTasksRow',
  fields: [{
    name: 'videoContainerCreatingTaskSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'videoContainerCreatingTaskEpisodeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }],
};

export async function listPendingVideoContainerCreatingTasks(
  runner: Database | Transaction,
  videoContainerCreatingTaskExecutionTimeMsLe: number,
): Promise<Array<ListPendingVideoContainerCreatingTasksRow>> {
  let [rows] = await runner.run({
    sql: "SELECT VideoContainerCreatingTask.seasonId, VideoContainerCreatingTask.episodeId FROM VideoContainerCreatingTask WHERE VideoContainerCreatingTask.executionTimeMs <= @videoContainerCreatingTaskExecutionTimeMsLe",
    params: {
      videoContainerCreatingTaskExecutionTimeMsLe: new Date(videoContainerCreatingTaskExecutionTimeMsLe).toISOString(),
    },
    types: {
      videoContainerCreatingTaskExecutionTimeMsLe: { type: "timestamp" },
    }
  });
  let resRows = new Array<ListPendingVideoContainerCreatingTasksRow>();
  for (let row of rows) {
    resRows.push({
      videoContainerCreatingTaskSeasonId: row.at(0).value,
      videoContainerCreatingTaskEpisodeId: row.at(1).value,
    });
  }
  return resRows;
}

export interface GetVideoContainerCreatingTaskMetadataRow {
  videoContainerCreatingTaskRetryCount: number,
  videoContainerCreatingTaskExecutionTimeMs: number,
}

export let GET_VIDEO_CONTAINER_CREATING_TASK_METADATA_ROW: MessageDescriptor<GetVideoContainerCreatingTaskMetadataRow> = {
  name: 'GetVideoContainerCreatingTaskMetadataRow',
  fields: [{
    name: 'videoContainerCreatingTaskRetryCount',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'videoContainerCreatingTaskExecutionTimeMs',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getVideoContainerCreatingTaskMetadata(
  runner: Database | Transaction,
  videoContainerCreatingTaskSeasonIdEq: string,
  videoContainerCreatingTaskEpisodeIdEq: string,
): Promise<Array<GetVideoContainerCreatingTaskMetadataRow>> {
  let [rows] = await runner.run({
    sql: "SELECT VideoContainerCreatingTask.retryCount, VideoContainerCreatingTask.executionTimeMs FROM VideoContainerCreatingTask WHERE (VideoContainerCreatingTask.seasonId = @videoContainerCreatingTaskSeasonIdEq AND VideoContainerCreatingTask.episodeId = @videoContainerCreatingTaskEpisodeIdEq)",
    params: {
      videoContainerCreatingTaskSeasonIdEq: videoContainerCreatingTaskSeasonIdEq,
      videoContainerCreatingTaskEpisodeIdEq: videoContainerCreatingTaskEpisodeIdEq,
    },
    types: {
      videoContainerCreatingTaskSeasonIdEq: { type: "string" },
      videoContainerCreatingTaskEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetVideoContainerCreatingTaskMetadataRow>();
  for (let row of rows) {
    resRows.push({
      videoContainerCreatingTaskRetryCount: row.at(0).value.value,
      videoContainerCreatingTaskExecutionTimeMs: row.at(1).value.valueOf(),
    });
  }
  return resRows;
}

export function updateVideoContainerCreatingTaskMetadataStatement(
  videoContainerCreatingTaskSeasonIdEq: string,
  videoContainerCreatingTaskEpisodeIdEq: string,
  setRetryCount: number,
  setExecutionTimeMs: number,
): Statement {
  return {
    sql: "UPDATE VideoContainerCreatingTask SET retryCount = @setRetryCount, executionTimeMs = @setExecutionTimeMs WHERE (VideoContainerCreatingTask.seasonId = @videoContainerCreatingTaskSeasonIdEq AND VideoContainerCreatingTask.episodeId = @videoContainerCreatingTaskEpisodeIdEq)",
    params: {
      videoContainerCreatingTaskSeasonIdEq: videoContainerCreatingTaskSeasonIdEq,
      videoContainerCreatingTaskEpisodeIdEq: videoContainerCreatingTaskEpisodeIdEq,
      setRetryCount: Spanner.float(setRetryCount),
      setExecutionTimeMs: new Date(setExecutionTimeMs).toISOString(),
    },
    types: {
      videoContainerCreatingTaskSeasonIdEq: { type: "string" },
      videoContainerCreatingTaskEpisodeIdEq: { type: "string" },
      setRetryCount: { type: "float64" },
      setExecutionTimeMs: { type: "timestamp" },
    }
  };
}

export function insertVideoContainerDeletingTaskStatement(
  videoContainerId: string,
  retryCount: number,
  executionTimeMs: number,
  createdTimeMs: number,
): Statement {
  return {
    sql: "INSERT VideoContainerDeletingTask (videoContainerId, retryCount, executionTimeMs, createdTimeMs) VALUES (@videoContainerId, @retryCount, @executionTimeMs, @createdTimeMs)",
    params: {
      videoContainerId: videoContainerId,
      retryCount: Spanner.float(retryCount),
      executionTimeMs: new Date(executionTimeMs).toISOString(),
      createdTimeMs: new Date(createdTimeMs).toISOString(),
    },
    types: {
      videoContainerId: { type: "string" },
      retryCount: { type: "float64" },
      executionTimeMs: { type: "timestamp" },
      createdTimeMs: { type: "timestamp" },
    }
  };
}

export function deleteVideoContainerDeletingTaskStatement(
  videoContainerDeletingTaskVideoContainerIdEq: string,
): Statement {
  return {
    sql: "DELETE VideoContainerDeletingTask WHERE (VideoContainerDeletingTask.videoContainerId = @videoContainerDeletingTaskVideoContainerIdEq)",
    params: {
      videoContainerDeletingTaskVideoContainerIdEq: videoContainerDeletingTaskVideoContainerIdEq,
    },
    types: {
      videoContainerDeletingTaskVideoContainerIdEq: { type: "string" },
    }
  };
}

export interface GetVideoContainerDeletingTaskRow {
  videoContainerDeletingTaskVideoContainerId: string,
  videoContainerDeletingTaskRetryCount: number,
  videoContainerDeletingTaskExecutionTimeMs: number,
  videoContainerDeletingTaskCreatedTimeMs: number,
}

export let GET_VIDEO_CONTAINER_DELETING_TASK_ROW: MessageDescriptor<GetVideoContainerDeletingTaskRow> = {
  name: 'GetVideoContainerDeletingTaskRow',
  fields: [{
    name: 'videoContainerDeletingTaskVideoContainerId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'videoContainerDeletingTaskRetryCount',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'videoContainerDeletingTaskExecutionTimeMs',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'videoContainerDeletingTaskCreatedTimeMs',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getVideoContainerDeletingTask(
  runner: Database | Transaction,
  videoContainerDeletingTaskVideoContainerIdEq: string,
): Promise<Array<GetVideoContainerDeletingTaskRow>> {
  let [rows] = await runner.run({
    sql: "SELECT VideoContainerDeletingTask.videoContainerId, VideoContainerDeletingTask.retryCount, VideoContainerDeletingTask.executionTimeMs, VideoContainerDeletingTask.createdTimeMs FROM VideoContainerDeletingTask WHERE (VideoContainerDeletingTask.videoContainerId = @videoContainerDeletingTaskVideoContainerIdEq)",
    params: {
      videoContainerDeletingTaskVideoContainerIdEq: videoContainerDeletingTaskVideoContainerIdEq,
    },
    types: {
      videoContainerDeletingTaskVideoContainerIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetVideoContainerDeletingTaskRow>();
  for (let row of rows) {
    resRows.push({
      videoContainerDeletingTaskVideoContainerId: row.at(0).value,
      videoContainerDeletingTaskRetryCount: row.at(1).value.value,
      videoContainerDeletingTaskExecutionTimeMs: row.at(2).value.valueOf(),
      videoContainerDeletingTaskCreatedTimeMs: row.at(3).value.valueOf(),
    });
  }
  return resRows;
}

export interface ListPendingVideoContainerDeletingTasksRow {
  videoContainerDeletingTaskVideoContainerId: string,
}

export let LIST_PENDING_VIDEO_CONTAINER_DELETING_TASKS_ROW: MessageDescriptor<ListPendingVideoContainerDeletingTasksRow> = {
  name: 'ListPendingVideoContainerDeletingTasksRow',
  fields: [{
    name: 'videoContainerDeletingTaskVideoContainerId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }],
};

export async function listPendingVideoContainerDeletingTasks(
  runner: Database | Transaction,
  videoContainerDeletingTaskExecutionTimeMsLe: number,
): Promise<Array<ListPendingVideoContainerDeletingTasksRow>> {
  let [rows] = await runner.run({
    sql: "SELECT VideoContainerDeletingTask.videoContainerId FROM VideoContainerDeletingTask WHERE VideoContainerDeletingTask.executionTimeMs <= @videoContainerDeletingTaskExecutionTimeMsLe",
    params: {
      videoContainerDeletingTaskExecutionTimeMsLe: new Date(videoContainerDeletingTaskExecutionTimeMsLe).toISOString(),
    },
    types: {
      videoContainerDeletingTaskExecutionTimeMsLe: { type: "timestamp" },
    }
  });
  let resRows = new Array<ListPendingVideoContainerDeletingTasksRow>();
  for (let row of rows) {
    resRows.push({
      videoContainerDeletingTaskVideoContainerId: row.at(0).value,
    });
  }
  return resRows;
}

export interface GetVideoContainerDeletingTaskMetadataRow {
  videoContainerDeletingTaskRetryCount: number,
  videoContainerDeletingTaskExecutionTimeMs: number,
}

export let GET_VIDEO_CONTAINER_DELETING_TASK_METADATA_ROW: MessageDescriptor<GetVideoContainerDeletingTaskMetadataRow> = {
  name: 'GetVideoContainerDeletingTaskMetadataRow',
  fields: [{
    name: 'videoContainerDeletingTaskRetryCount',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'videoContainerDeletingTaskExecutionTimeMs',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getVideoContainerDeletingTaskMetadata(
  runner: Database | Transaction,
  videoContainerDeletingTaskVideoContainerIdEq: string,
): Promise<Array<GetVideoContainerDeletingTaskMetadataRow>> {
  let [rows] = await runner.run({
    sql: "SELECT VideoContainerDeletingTask.retryCount, VideoContainerDeletingTask.executionTimeMs FROM VideoContainerDeletingTask WHERE (VideoContainerDeletingTask.videoContainerId = @videoContainerDeletingTaskVideoContainerIdEq)",
    params: {
      videoContainerDeletingTaskVideoContainerIdEq: videoContainerDeletingTaskVideoContainerIdEq,
    },
    types: {
      videoContainerDeletingTaskVideoContainerIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetVideoContainerDeletingTaskMetadataRow>();
  for (let row of rows) {
    resRows.push({
      videoContainerDeletingTaskRetryCount: row.at(0).value.value,
      videoContainerDeletingTaskExecutionTimeMs: row.at(1).value.valueOf(),
    });
  }
  return resRows;
}

export function updateVideoContainerDeletingTaskMetadataStatement(
  videoContainerDeletingTaskVideoContainerIdEq: string,
  setRetryCount: number,
  setExecutionTimeMs: number,
): Statement {
  return {
    sql: "UPDATE VideoContainerDeletingTask SET retryCount = @setRetryCount, executionTimeMs = @setExecutionTimeMs WHERE (VideoContainerDeletingTask.videoContainerId = @videoContainerDeletingTaskVideoContainerIdEq)",
    params: {
      videoContainerDeletingTaskVideoContainerIdEq: videoContainerDeletingTaskVideoContainerIdEq,
      setRetryCount: Spanner.float(setRetryCount),
      setExecutionTimeMs: new Date(setExecutionTimeMs).toISOString(),
    },
    types: {
      videoContainerDeletingTaskVideoContainerIdEq: { type: "string" },
      setRetryCount: { type: "float64" },
      setExecutionTimeMs: { type: "timestamp" },
    }
  };
}

export function insertCoverImageDeletingTaskStatement(
  r2Filename: string,
  retryCount: number,
  executionTimeMs: number,
  createdTimeMs: number,
): Statement {
  return {
    sql: "INSERT CoverImageDeletingTask (r2Filename, retryCount, executionTimeMs, createdTimeMs) VALUES (@r2Filename, @retryCount, @executionTimeMs, @createdTimeMs)",
    params: {
      r2Filename: r2Filename,
      retryCount: Spanner.float(retryCount),
      executionTimeMs: new Date(executionTimeMs).toISOString(),
      createdTimeMs: new Date(createdTimeMs).toISOString(),
    },
    types: {
      r2Filename: { type: "string" },
      retryCount: { type: "float64" },
      executionTimeMs: { type: "timestamp" },
      createdTimeMs: { type: "timestamp" },
    }
  };
}

export function deleteCoverImageDeletingTaskStatement(
  coverImageDeletingTaskR2FilenameEq: string,
): Statement {
  return {
    sql: "DELETE CoverImageDeletingTask WHERE (CoverImageDeletingTask.r2Filename = @coverImageDeletingTaskR2FilenameEq)",
    params: {
      coverImageDeletingTaskR2FilenameEq: coverImageDeletingTaskR2FilenameEq,
    },
    types: {
      coverImageDeletingTaskR2FilenameEq: { type: "string" },
    }
  };
}

export interface GetCoverImageDeletingTaskRow {
  coverImageDeletingTaskR2Filename: string,
  coverImageDeletingTaskRetryCount: number,
  coverImageDeletingTaskExecutionTimeMs: number,
  coverImageDeletingTaskCreatedTimeMs: number,
}

export let GET_COVER_IMAGE_DELETING_TASK_ROW: MessageDescriptor<GetCoverImageDeletingTaskRow> = {
  name: 'GetCoverImageDeletingTaskRow',
  fields: [{
    name: 'coverImageDeletingTaskR2Filename',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'coverImageDeletingTaskRetryCount',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'coverImageDeletingTaskExecutionTimeMs',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'coverImageDeletingTaskCreatedTimeMs',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getCoverImageDeletingTask(
  runner: Database | Transaction,
  coverImageDeletingTaskR2FilenameEq: string,
): Promise<Array<GetCoverImageDeletingTaskRow>> {
  let [rows] = await runner.run({
    sql: "SELECT CoverImageDeletingTask.r2Filename, CoverImageDeletingTask.retryCount, CoverImageDeletingTask.executionTimeMs, CoverImageDeletingTask.createdTimeMs FROM CoverImageDeletingTask WHERE (CoverImageDeletingTask.r2Filename = @coverImageDeletingTaskR2FilenameEq)",
    params: {
      coverImageDeletingTaskR2FilenameEq: coverImageDeletingTaskR2FilenameEq,
    },
    types: {
      coverImageDeletingTaskR2FilenameEq: { type: "string" },
    }
  });
  let resRows = new Array<GetCoverImageDeletingTaskRow>();
  for (let row of rows) {
    resRows.push({
      coverImageDeletingTaskR2Filename: row.at(0).value,
      coverImageDeletingTaskRetryCount: row.at(1).value.value,
      coverImageDeletingTaskExecutionTimeMs: row.at(2).value.valueOf(),
      coverImageDeletingTaskCreatedTimeMs: row.at(3).value.valueOf(),
    });
  }
  return resRows;
}

export interface ListPendingCoverImageDeletingTasksRow {
  coverImageDeletingTaskR2Filename: string,
}

export let LIST_PENDING_COVER_IMAGE_DELETING_TASKS_ROW: MessageDescriptor<ListPendingCoverImageDeletingTasksRow> = {
  name: 'ListPendingCoverImageDeletingTasksRow',
  fields: [{
    name: 'coverImageDeletingTaskR2Filename',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }],
};

export async function listPendingCoverImageDeletingTasks(
  runner: Database | Transaction,
  coverImageDeletingTaskExecutionTimeMsLe: number,
): Promise<Array<ListPendingCoverImageDeletingTasksRow>> {
  let [rows] = await runner.run({
    sql: "SELECT CoverImageDeletingTask.r2Filename FROM CoverImageDeletingTask WHERE CoverImageDeletingTask.executionTimeMs <= @coverImageDeletingTaskExecutionTimeMsLe",
    params: {
      coverImageDeletingTaskExecutionTimeMsLe: new Date(coverImageDeletingTaskExecutionTimeMsLe).toISOString(),
    },
    types: {
      coverImageDeletingTaskExecutionTimeMsLe: { type: "timestamp" },
    }
  });
  let resRows = new Array<ListPendingCoverImageDeletingTasksRow>();
  for (let row of rows) {
    resRows.push({
      coverImageDeletingTaskR2Filename: row.at(0).value,
    });
  }
  return resRows;
}

export interface GetCoverImageDeletingTaskMetadataRow {
  coverImageDeletingTaskRetryCount: number,
  coverImageDeletingTaskExecutionTimeMs: number,
}

export let GET_COVER_IMAGE_DELETING_TASK_METADATA_ROW: MessageDescriptor<GetCoverImageDeletingTaskMetadataRow> = {
  name: 'GetCoverImageDeletingTaskMetadataRow',
  fields: [{
    name: 'coverImageDeletingTaskRetryCount',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'coverImageDeletingTaskExecutionTimeMs',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getCoverImageDeletingTaskMetadata(
  runner: Database | Transaction,
  coverImageDeletingTaskR2FilenameEq: string,
): Promise<Array<GetCoverImageDeletingTaskMetadataRow>> {
  let [rows] = await runner.run({
    sql: "SELECT CoverImageDeletingTask.retryCount, CoverImageDeletingTask.executionTimeMs FROM CoverImageDeletingTask WHERE (CoverImageDeletingTask.r2Filename = @coverImageDeletingTaskR2FilenameEq)",
    params: {
      coverImageDeletingTaskR2FilenameEq: coverImageDeletingTaskR2FilenameEq,
    },
    types: {
      coverImageDeletingTaskR2FilenameEq: { type: "string" },
    }
  });
  let resRows = new Array<GetCoverImageDeletingTaskMetadataRow>();
  for (let row of rows) {
    resRows.push({
      coverImageDeletingTaskRetryCount: row.at(0).value.value,
      coverImageDeletingTaskExecutionTimeMs: row.at(1).value.valueOf(),
    });
  }
  return resRows;
}

export function updateCoverImageDeletingTaskMetadataStatement(
  coverImageDeletingTaskR2FilenameEq: string,
  setRetryCount: number,
  setExecutionTimeMs: number,
): Statement {
  return {
    sql: "UPDATE CoverImageDeletingTask SET retryCount = @setRetryCount, executionTimeMs = @setExecutionTimeMs WHERE (CoverImageDeletingTask.r2Filename = @coverImageDeletingTaskR2FilenameEq)",
    params: {
      coverImageDeletingTaskR2FilenameEq: coverImageDeletingTaskR2FilenameEq,
      setRetryCount: Spanner.float(setRetryCount),
      setExecutionTimeMs: new Date(setExecutionTimeMs).toISOString(),
    },
    types: {
      coverImageDeletingTaskR2FilenameEq: { type: "string" },
      setRetryCount: { type: "float64" },
      setExecutionTimeMs: { type: "timestamp" },
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

export interface CheckPresenceOfSeasonRow {
  seasonLastChangeTimeMs: number,
}

export let CHECK_PRESENCE_OF_SEASON_ROW: MessageDescriptor<CheckPresenceOfSeasonRow> = {
  name: 'CheckPresenceOfSeasonRow',
  fields: [{
    name: 'seasonLastChangeTimeMs',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function checkPresenceOfSeason(
  runner: Database | Transaction,
  seasonSeasonIdEq: string,
): Promise<Array<CheckPresenceOfSeasonRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.lastChangeTimeMs FROM Season WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: seasonSeasonIdEq,
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<CheckPresenceOfSeasonRow>();
  for (let row of rows) {
    resRows.push({
      seasonLastChangeTimeMs: row.at(0).value.value,
    });
  }
  return resRows;
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

export interface ListPublishedSeasonsByPublishTimeForConsumerRow {
  sData: Season,
  srData: SeasonRating,
}

export let LIST_PUBLISHED_SEASONS_BY_PUBLISH_TIME_FOR_CONSUMER_ROW: MessageDescriptor<ListPublishedSeasonsByPublishTimeForConsumerRow> = {
  name: 'ListPublishedSeasonsByPublishTimeForConsumerRow',
  fields: [{
    name: 'sData',
    index: 1,
    messageType: SEASON,
  }, {
    name: 'srData',
    index: 2,
    messageType: SEASON_RATING,
  }],
};

export async function listPublishedSeasonsByPublishTimeForConsumer(
  runner: Database | Transaction,
  sStateEq: SeasonState,
  sRecentPublishTimeMsLt: number,
  limit: number,
): Promise<Array<ListPublishedSeasonsByPublishTimeForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT s.data, sr.data FROM Season AS s INNER JOIN SeasonRating AS sr ON s.seasonId = sr.seasonId WHERE (s.state = @sStateEq AND s.recentPublishTimeMs < @sRecentPublishTimeMsLt) ORDER BY s.recentPublishTimeMs DESC LIMIT @limit",
    params: {
      sStateEq: Spanner.float(sStateEq),
      sRecentPublishTimeMsLt: Spanner.float(sRecentPublishTimeMsLt),
      limit: limit.toString(),
    },
    types: {
      sStateEq: { type: "float64" },
      sRecentPublishTimeMsLt: { type: "float64" },
      limit: { type: "int64" },
    }
  });
  let resRows = new Array<ListPublishedSeasonsByPublishTimeForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      sData: deserializeMessage(row.at(0).value, SEASON),
      srData: deserializeMessage(row.at(1).value, SEASON_RATING),
    });
  }
  return resRows;
}

export interface ListPublishedSeasonsByRatingForConsumerRow {
  sData: Season,
  srData: SeasonRating,
}

export let LIST_PUBLISHED_SEASONS_BY_RATING_FOR_CONSUMER_ROW: MessageDescriptor<ListPublishedSeasonsByRatingForConsumerRow> = {
  name: 'ListPublishedSeasonsByRatingForConsumerRow',
  fields: [{
    name: 'sData',
    index: 1,
    messageType: SEASON,
  }, {
    name: 'srData',
    index: 2,
    messageType: SEASON_RATING,
  }],
};

export async function listPublishedSeasonsByRatingForConsumer(
  runner: Database | Transaction,
  sStateEq: SeasonState,
  srAverageRatingLt: number,
  srAverageRatingEq: number,
  srUpdatedTimeMsLt: number,
  limit: number,
): Promise<Array<ListPublishedSeasonsByRatingForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT s.data, sr.data FROM Season AS s INNER JOIN SeasonRating AS sr ON s.seasonId = sr.seasonId WHERE (s.state = @sStateEq AND (sr.averageRating < @srAverageRatingLt OR (sr.averageRating = @srAverageRatingEq AND sr.updatedTimeMs < @srUpdatedTimeMsLt))) ORDER BY sr.averageRating DESC, sr.updatedTimeMs DESC LIMIT @limit",
    params: {
      sStateEq: Spanner.float(sStateEq),
      srAverageRatingLt: Spanner.float(srAverageRatingLt),
      srAverageRatingEq: Spanner.float(srAverageRatingEq),
      srUpdatedTimeMsLt: Spanner.float(srUpdatedTimeMsLt),
      limit: limit.toString(),
    },
    types: {
      sStateEq: { type: "float64" },
      srAverageRatingLt: { type: "float64" },
      srAverageRatingEq: { type: "float64" },
      srUpdatedTimeMsLt: { type: "float64" },
      limit: { type: "int64" },
    }
  });
  let resRows = new Array<ListPublishedSeasonsByRatingForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      sData: deserializeMessage(row.at(0).value, SEASON),
      srData: deserializeMessage(row.at(1).value, SEASON_RATING),
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

export interface CheckPresenceOfEpisodeRow {
  episodePublishTimeMs: number,
}

export let CHECK_PRESENCE_OF_EPISODE_ROW: MessageDescriptor<CheckPresenceOfEpisodeRow> = {
  name: 'CheckPresenceOfEpisodeRow',
  fields: [{
    name: 'episodePublishTimeMs',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function checkPresenceOfEpisode(
  runner: Database | Transaction,
  episodeSeasonIdEq: string,
  episodeEpisodeIdEq: string,
): Promise<Array<CheckPresenceOfEpisodeRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Episode.publishTimeMs FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
    params: {
      episodeSeasonIdEq: episodeSeasonIdEq,
      episodeEpisodeIdEq: episodeEpisodeIdEq,
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<CheckPresenceOfEpisodeRow>();
  for (let row of rows) {
    resRows.push({
      episodePublishTimeMs: row.at(0).value.value,
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
