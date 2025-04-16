import { SeasonState, SEASON_STATE } from '@phading/product_service_interface/show/season_state';
import { Spanner, Database, Transaction } from '@google-cloud/spanner';
import { Statement } from '@google-cloud/spanner/build/src/transaction';
import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';
import { toEnumFromNumber, serializeMessage, deserializeMessage } from '@selfage/message/serializer';
import { VideoContainer, VIDEO_CONTAINER } from '@phading/product_service_interface/show/video_container';
import { EpisodeState, EPISODE_STATE } from '@phading/product_service_interface/show/episode_state';

export function insertSeasonStatement(
  args: {
    seasonId: string,
    publisherId?: string,
    state?: SeasonState,
    name?: string,
    coverImageR2Filename?: string,
    totalEpisodes?: number,
    lastChangeTimeMs?: number,
    recentPremiereTimeMs?: number,
    description?: string,
    createdTimeMs: number,
    totalRatings?: number,
    ratingsCount?: number,
    averageRating?: number,
    ratingUpdatedTimeMs?: number,
  }
): Statement {
  return {
    sql: "INSERT Season (seasonId, publisherId, state, name, coverImageR2Filename, totalEpisodes, lastChangeTimeMs, recentPremiereTimeMs, description, createdTimeMs, totalRatings, ratingsCount, averageRating, ratingUpdatedTimeMs) VALUES (@seasonId, @publisherId, @state, @name, @coverImageR2Filename, @totalEpisodes, @lastChangeTimeMs, @recentPremiereTimeMs, @description, @createdTimeMs, @totalRatings, @ratingsCount, @averageRating, @ratingUpdatedTimeMs)",
    params: {
      seasonId: args.seasonId,
      publisherId: args.publisherId == null ? null : args.publisherId,
      state: args.state == null ? null : Spanner.float(args.state),
      name: args.name == null ? null : args.name,
      coverImageR2Filename: args.coverImageR2Filename == null ? null : args.coverImageR2Filename,
      totalEpisodes: args.totalEpisodes == null ? null : Spanner.float(args.totalEpisodes),
      lastChangeTimeMs: args.lastChangeTimeMs == null ? null : Spanner.float(args.lastChangeTimeMs),
      recentPremiereTimeMs: args.recentPremiereTimeMs == null ? null : Spanner.float(args.recentPremiereTimeMs),
      description: args.description == null ? null : args.description,
      createdTimeMs: args.createdTimeMs.toString(),
      totalRatings: args.totalRatings == null ? null : Spanner.float(args.totalRatings),
      ratingsCount: args.ratingsCount == null ? null : Spanner.float(args.ratingsCount),
      averageRating: args.averageRating == null ? null : Spanner.float(args.averageRating),
      ratingUpdatedTimeMs: args.ratingUpdatedTimeMs == null ? null : Spanner.float(args.ratingUpdatedTimeMs),
    },
    types: {
      seasonId: { type: "string" },
      publisherId: { type: "string" },
      state: { type: "float64" },
      name: { type: "string" },
      coverImageR2Filename: { type: "string" },
      totalEpisodes: { type: "float64" },
      lastChangeTimeMs: { type: "float64" },
      recentPremiereTimeMs: { type: "float64" },
      description: { type: "string" },
      createdTimeMs: { type: "int64" },
      totalRatings: { type: "float64" },
      ratingsCount: { type: "float64" },
      averageRating: { type: "float64" },
      ratingUpdatedTimeMs: { type: "float64" },
    }
  };
}

export function deleteSeasonStatement(
  args: {
    seasonSeasonIdEq: string,
  }
): Statement {
  return {
    sql: "DELETE Season WHERE (Season.seasonId = @seasonSeasonIdEq)",
    params: {
      seasonSeasonIdEq: args.seasonSeasonIdEq,
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
    }
  };
}

export interface GetSeasonRow {
  seasonSeasonId?: string,
  seasonPublisherId?: string,
  seasonState?: SeasonState,
  seasonName?: string,
  seasonCoverImageR2Filename?: string,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimeMs?: number,
  seasonRecentPremiereTimeMs?: number,
  seasonDescription?: string,
  seasonCreatedTimeMs?: number,
  seasonTotalRatings?: number,
  seasonRatingsCount?: number,
  seasonAverageRating?: number,
  seasonRatingUpdatedTimeMs?: number,
}

export let GET_SEASON_ROW: MessageDescriptor<GetSeasonRow> = {
  name: 'GetSeasonRow',
  fields: [{
    name: 'seasonSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'seasonName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonDescription',
    index: 9,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCreatedTimeMs',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonTotalRatings',
    index: 11,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingsCount',
    index: 12,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonAverageRating',
    index: 13,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingUpdatedTimeMs',
    index: 14,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getSeason(
  runner: Database | Transaction,
  args: {
    seasonSeasonIdEq: string,
  }
): Promise<Array<GetSeasonRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.seasonId, Season.publisherId, Season.state, Season.name, Season.coverImageR2Filename, Season.totalEpisodes, Season.lastChangeTimeMs, Season.recentPremiereTimeMs, Season.description, Season.createdTimeMs, Season.totalRatings, Season.ratingsCount, Season.averageRating, Season.ratingUpdatedTimeMs FROM Season WHERE (Season.seasonId = @seasonSeasonIdEq)",
    params: {
      seasonSeasonIdEq: args.seasonSeasonIdEq,
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      seasonName: row.at(3).value == null ? undefined : row.at(3).value,
      seasonCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      seasonTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      seasonLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      seasonRecentPremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      seasonDescription: row.at(8).value == null ? undefined : row.at(8).value,
      seasonCreatedTimeMs: row.at(9).value == null ? undefined : row.at(9).value.valueOf(),
      seasonTotalRatings: row.at(10).value == null ? undefined : row.at(10).value.value,
      seasonRatingsCount: row.at(11).value == null ? undefined : row.at(11).value.value,
      seasonAverageRating: row.at(12).value == null ? undefined : row.at(12).value.value,
      seasonRatingUpdatedTimeMs: row.at(13).value == null ? undefined : row.at(13).value.value,
    });
  }
  return resRows;
}

export function insertSeasonGradeStatement(
  args: {
    seasonId: string,
    gradeId: string,
    startDate?: string,
    endDate?: string,
    grade?: number,
  }
): Statement {
  return {
    sql: "INSERT SeasonGrade (seasonId, gradeId, startDate, endDate, grade) VALUES (@seasonId, @gradeId, @startDate, @endDate, @grade)",
    params: {
      seasonId: args.seasonId,
      gradeId: args.gradeId,
      startDate: args.startDate == null ? null : args.startDate,
      endDate: args.endDate == null ? null : args.endDate,
      grade: args.grade == null ? null : Spanner.float(args.grade),
    },
    types: {
      seasonId: { type: "string" },
      gradeId: { type: "string" },
      startDate: { type: "string" },
      endDate: { type: "string" },
      grade: { type: "float64" },
    }
  };
}

export function insertEpisodeStatement(
  args: {
    seasonId: string,
    episodeId: string,
    index?: number,
    name?: string,
    videoContainerId?: string,
    videoContainer?: VideoContainer,
    state?: EpisodeState,
    premiereTimeMs?: number,
  }
): Statement {
  return {
    sql: "INSERT Episode (seasonId, episodeId, index, name, videoContainerId, videoContainer, state, premiereTimeMs) VALUES (@seasonId, @episodeId, @index, @name, @videoContainerId, @videoContainer, @state, @premiereTimeMs)",
    params: {
      seasonId: args.seasonId,
      episodeId: args.episodeId,
      index: args.index == null ? null : Spanner.float(args.index),
      name: args.name == null ? null : args.name,
      videoContainerId: args.videoContainerId == null ? null : args.videoContainerId,
      videoContainer: args.videoContainer == null ? null : Buffer.from(serializeMessage(args.videoContainer, VIDEO_CONTAINER).buffer),
      state: args.state == null ? null : Spanner.float(args.state),
      premiereTimeMs: args.premiereTimeMs == null ? null : Spanner.float(args.premiereTimeMs),
    },
    types: {
      seasonId: { type: "string" },
      episodeId: { type: "string" },
      index: { type: "float64" },
      name: { type: "string" },
      videoContainerId: { type: "string" },
      videoContainer: { type: "bytes" },
      state: { type: "float64" },
      premiereTimeMs: { type: "float64" },
    }
  };
}

export function deleteEpisodeStatement(
  args: {
    episodeSeasonIdEq: string,
    episodeEpisodeIdEq: string,
  }
): Statement {
  return {
    sql: "DELETE Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
    params: {
      episodeSeasonIdEq: args.episodeSeasonIdEq,
      episodeEpisodeIdEq: args.episodeEpisodeIdEq,
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
    }
  };
}

export interface GetEpisodeRow {
  episodeSeasonId?: string,
  episodeEpisodeId?: string,
  episodeIndex?: number,
  episodeName?: string,
  episodeVideoContainerId?: string,
  episodeVideoContainer?: VideoContainer,
  episodeState?: EpisodeState,
  episodePremiereTimeMs?: number,
}

export let GET_EPISODE_ROW: MessageDescriptor<GetEpisodeRow> = {
  name: 'GetEpisodeRow',
  fields: [{
    name: 'episodeSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeEpisodeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeIndex',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'episodeName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainerId',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainer',
    index: 6,
    messageType: VIDEO_CONTAINER,
  }, {
    name: 'episodeState',
    index: 7,
    enumType: EPISODE_STATE,
  }, {
    name: 'episodePremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getEpisode(
  runner: Database | Transaction,
  args: {
    episodeSeasonIdEq: string,
    episodeEpisodeIdEq: string,
  }
): Promise<Array<GetEpisodeRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Episode.seasonId, Episode.episodeId, Episode.index, Episode.name, Episode.videoContainerId, Episode.videoContainer, Episode.state, Episode.premiereTimeMs FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
    params: {
      episodeSeasonIdEq: args.episodeSeasonIdEq,
      episodeEpisodeIdEq: args.episodeEpisodeIdEq,
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetEpisodeRow>();
  for (let row of rows) {
    resRows.push({
      episodeSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      episodeEpisodeId: row.at(1).value == null ? undefined : row.at(1).value,
      episodeIndex: row.at(2).value == null ? undefined : row.at(2).value.value,
      episodeName: row.at(3).value == null ? undefined : row.at(3).value,
      episodeVideoContainerId: row.at(4).value == null ? undefined : row.at(4).value,
      episodeVideoContainer: row.at(5).value == null ? undefined : deserializeMessage(row.at(5).value, VIDEO_CONTAINER),
      episodeState: row.at(6).value == null ? undefined : toEnumFromNumber(row.at(6).value.value, EPISODE_STATE),
      episodePremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
    });
  }
  return resRows;
}

export function insertIndividualSeasonRatingStatement(
  args: {
    raterId: string,
    seasonId: string,
    rating?: number,
    ratedTimeMs?: number,
  }
): Statement {
  return {
    sql: "INSERT IndividualSeasonRating (raterId, seasonId, rating, ratedTimeMs) VALUES (@raterId, @seasonId, @rating, @ratedTimeMs)",
    params: {
      raterId: args.raterId,
      seasonId: args.seasonId,
      rating: args.rating == null ? null : Spanner.float(args.rating),
      ratedTimeMs: args.ratedTimeMs == null ? null : Spanner.float(args.ratedTimeMs),
    },
    types: {
      raterId: { type: "string" },
      seasonId: { type: "string" },
      rating: { type: "float64" },
      ratedTimeMs: { type: "float64" },
    }
  };
}

export function deleteIndividualSeasonRatingStatement(
  args: {
    individualSeasonRatingRaterIdEq: string,
    individualSeasonRatingSeasonIdEq: string,
  }
): Statement {
  return {
    sql: "DELETE IndividualSeasonRating WHERE (IndividualSeasonRating.raterId = @individualSeasonRatingRaterIdEq AND IndividualSeasonRating.seasonId = @individualSeasonRatingSeasonIdEq)",
    params: {
      individualSeasonRatingRaterIdEq: args.individualSeasonRatingRaterIdEq,
      individualSeasonRatingSeasonIdEq: args.individualSeasonRatingSeasonIdEq,
    },
    types: {
      individualSeasonRatingRaterIdEq: { type: "string" },
      individualSeasonRatingSeasonIdEq: { type: "string" },
    }
  };
}

export interface GetIndividualSeasonRatingRow {
  individualSeasonRatingRaterId?: string,
  individualSeasonRatingSeasonId?: string,
  individualSeasonRatingRating?: number,
  individualSeasonRatingRatedTimeMs?: number,
}

export let GET_INDIVIDUAL_SEASON_RATING_ROW: MessageDescriptor<GetIndividualSeasonRatingRow> = {
  name: 'GetIndividualSeasonRatingRow',
  fields: [{
    name: 'individualSeasonRatingRaterId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'individualSeasonRatingSeasonId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'individualSeasonRatingRating',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'individualSeasonRatingRatedTimeMs',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getIndividualSeasonRating(
  runner: Database | Transaction,
  args: {
    individualSeasonRatingRaterIdEq: string,
    individualSeasonRatingSeasonIdEq: string,
  }
): Promise<Array<GetIndividualSeasonRatingRow>> {
  let [rows] = await runner.run({
    sql: "SELECT IndividualSeasonRating.raterId, IndividualSeasonRating.seasonId, IndividualSeasonRating.rating, IndividualSeasonRating.ratedTimeMs FROM IndividualSeasonRating WHERE (IndividualSeasonRating.raterId = @individualSeasonRatingRaterIdEq AND IndividualSeasonRating.seasonId = @individualSeasonRatingSeasonIdEq)",
    params: {
      individualSeasonRatingRaterIdEq: args.individualSeasonRatingRaterIdEq,
      individualSeasonRatingSeasonIdEq: args.individualSeasonRatingSeasonIdEq,
    },
    types: {
      individualSeasonRatingRaterIdEq: { type: "string" },
      individualSeasonRatingSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetIndividualSeasonRatingRow>();
  for (let row of rows) {
    resRows.push({
      individualSeasonRatingRaterId: row.at(0).value == null ? undefined : row.at(0).value,
      individualSeasonRatingSeasonId: row.at(1).value == null ? undefined : row.at(1).value,
      individualSeasonRatingRating: row.at(2).value == null ? undefined : row.at(2).value.value,
      individualSeasonRatingRatedTimeMs: row.at(3).value == null ? undefined : row.at(3).value.value,
    });
  }
  return resRows;
}

export function updateIndividualSeasonRatingStatement(
  args: {
    individualSeasonRatingRaterIdEq: string,
    individualSeasonRatingSeasonIdEq: string,
    setRating?: number,
    setRatedTimeMs?: number,
  }
): Statement {
  return {
    sql: "UPDATE IndividualSeasonRating SET rating = @setRating, ratedTimeMs = @setRatedTimeMs WHERE (IndividualSeasonRating.raterId = @individualSeasonRatingRaterIdEq AND IndividualSeasonRating.seasonId = @individualSeasonRatingSeasonIdEq)",
    params: {
      individualSeasonRatingRaterIdEq: args.individualSeasonRatingRaterIdEq,
      individualSeasonRatingSeasonIdEq: args.individualSeasonRatingSeasonIdEq,
      setRating: args.setRating == null ? null : Spanner.float(args.setRating),
      setRatedTimeMs: args.setRatedTimeMs == null ? null : Spanner.float(args.setRatedTimeMs),
    },
    types: {
      individualSeasonRatingRaterIdEq: { type: "string" },
      individualSeasonRatingSeasonIdEq: { type: "string" },
      setRating: { type: "float64" },
      setRatedTimeMs: { type: "float64" },
    }
  };
}

export function insertCoverImageFileStatement(
  args: {
    r2Filename: string,
  }
): Statement {
  return {
    sql: "INSERT CoverImageFile (r2Filename) VALUES (@r2Filename)",
    params: {
      r2Filename: args.r2Filename,
    },
    types: {
      r2Filename: { type: "string" },
    }
  };
}

export function deleteCoverImageFileStatement(
  args: {
    coverImageFileR2FilenameEq: string,
  }
): Statement {
  return {
    sql: "DELETE CoverImageFile WHERE (CoverImageFile.r2Filename = @coverImageFileR2FilenameEq)",
    params: {
      coverImageFileR2FilenameEq: args.coverImageFileR2FilenameEq,
    },
    types: {
      coverImageFileR2FilenameEq: { type: "string" },
    }
  };
}

export interface GetCoverImageFileRow {
  coverImageFileR2Filename?: string,
}

export let GET_COVER_IMAGE_FILE_ROW: MessageDescriptor<GetCoverImageFileRow> = {
  name: 'GetCoverImageFileRow',
  fields: [{
    name: 'coverImageFileR2Filename',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }],
};

export async function getCoverImageFile(
  runner: Database | Transaction,
  args: {
    coverImageFileR2FilenameEq: string,
  }
): Promise<Array<GetCoverImageFileRow>> {
  let [rows] = await runner.run({
    sql: "SELECT CoverImageFile.r2Filename FROM CoverImageFile WHERE (CoverImageFile.r2Filename = @coverImageFileR2FilenameEq)",
    params: {
      coverImageFileR2FilenameEq: args.coverImageFileR2FilenameEq,
    },
    types: {
      coverImageFileR2FilenameEq: { type: "string" },
    }
  });
  let resRows = new Array<GetCoverImageFileRow>();
  for (let row of rows) {
    resRows.push({
      coverImageFileR2Filename: row.at(0).value == null ? undefined : row.at(0).value,
    });
  }
  return resRows;
}

export function insertVideoContainerKeyStatement(
  args: {
    key: string,
  }
): Statement {
  return {
    sql: "INSERT VideoContainerKey (key) VALUES (@key)",
    params: {
      key: args.key,
    },
    types: {
      key: { type: "string" },
    }
  };
}

export function deleteVideoContainerKeyStatement(
  args: {
    videoContainerKeyKeyEq: string,
  }
): Statement {
  return {
    sql: "DELETE VideoContainerKey WHERE (VideoContainerKey.key = @videoContainerKeyKeyEq)",
    params: {
      videoContainerKeyKeyEq: args.videoContainerKeyKeyEq,
    },
    types: {
      videoContainerKeyKeyEq: { type: "string" },
    }
  };
}

export interface GetVideoContainerKeyRow {
  videoContainerKeyKey?: string,
}

export let GET_VIDEO_CONTAINER_KEY_ROW: MessageDescriptor<GetVideoContainerKeyRow> = {
  name: 'GetVideoContainerKeyRow',
  fields: [{
    name: 'videoContainerKeyKey',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }],
};

export async function getVideoContainerKey(
  runner: Database | Transaction,
  args: {
    videoContainerKeyKeyEq: string,
  }
): Promise<Array<GetVideoContainerKeyRow>> {
  let [rows] = await runner.run({
    sql: "SELECT VideoContainerKey.key FROM VideoContainerKey WHERE (VideoContainerKey.key = @videoContainerKeyKeyEq)",
    params: {
      videoContainerKeyKeyEq: args.videoContainerKeyKeyEq,
    },
    types: {
      videoContainerKeyKeyEq: { type: "string" },
    }
  });
  let resRows = new Array<GetVideoContainerKeyRow>();
  for (let row of rows) {
    resRows.push({
      videoContainerKeyKey: row.at(0).value == null ? undefined : row.at(0).value,
    });
  }
  return resRows;
}

export function insertVideoContainerCreatingTaskStatement(
  args: {
    seasonId: string,
    episodeId: string,
    retryCount?: number,
    executionTimeMs?: number,
    createdTimeMs?: number,
  }
): Statement {
  return {
    sql: "INSERT VideoContainerCreatingTask (seasonId, episodeId, retryCount, executionTimeMs, createdTimeMs) VALUES (@seasonId, @episodeId, @retryCount, @executionTimeMs, @createdTimeMs)",
    params: {
      seasonId: args.seasonId,
      episodeId: args.episodeId,
      retryCount: args.retryCount == null ? null : Spanner.float(args.retryCount),
      executionTimeMs: args.executionTimeMs == null ? null : new Date(args.executionTimeMs).toISOString(),
      createdTimeMs: args.createdTimeMs == null ? null : new Date(args.createdTimeMs).toISOString(),
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
  args: {
    videoContainerCreatingTaskSeasonIdEq: string,
    videoContainerCreatingTaskEpisodeIdEq: string,
  }
): Statement {
  return {
    sql: "DELETE VideoContainerCreatingTask WHERE (VideoContainerCreatingTask.seasonId = @videoContainerCreatingTaskSeasonIdEq AND VideoContainerCreatingTask.episodeId = @videoContainerCreatingTaskEpisodeIdEq)",
    params: {
      videoContainerCreatingTaskSeasonIdEq: args.videoContainerCreatingTaskSeasonIdEq,
      videoContainerCreatingTaskEpisodeIdEq: args.videoContainerCreatingTaskEpisodeIdEq,
    },
    types: {
      videoContainerCreatingTaskSeasonIdEq: { type: "string" },
      videoContainerCreatingTaskEpisodeIdEq: { type: "string" },
    }
  };
}

export interface GetVideoContainerCreatingTaskRow {
  videoContainerCreatingTaskSeasonId?: string,
  videoContainerCreatingTaskEpisodeId?: string,
  videoContainerCreatingTaskRetryCount?: number,
  videoContainerCreatingTaskExecutionTimeMs?: number,
  videoContainerCreatingTaskCreatedTimeMs?: number,
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
  args: {
    videoContainerCreatingTaskSeasonIdEq: string,
    videoContainerCreatingTaskEpisodeIdEq: string,
  }
): Promise<Array<GetVideoContainerCreatingTaskRow>> {
  let [rows] = await runner.run({
    sql: "SELECT VideoContainerCreatingTask.seasonId, VideoContainerCreatingTask.episodeId, VideoContainerCreatingTask.retryCount, VideoContainerCreatingTask.executionTimeMs, VideoContainerCreatingTask.createdTimeMs FROM VideoContainerCreatingTask WHERE (VideoContainerCreatingTask.seasonId = @videoContainerCreatingTaskSeasonIdEq AND VideoContainerCreatingTask.episodeId = @videoContainerCreatingTaskEpisodeIdEq)",
    params: {
      videoContainerCreatingTaskSeasonIdEq: args.videoContainerCreatingTaskSeasonIdEq,
      videoContainerCreatingTaskEpisodeIdEq: args.videoContainerCreatingTaskEpisodeIdEq,
    },
    types: {
      videoContainerCreatingTaskSeasonIdEq: { type: "string" },
      videoContainerCreatingTaskEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetVideoContainerCreatingTaskRow>();
  for (let row of rows) {
    resRows.push({
      videoContainerCreatingTaskSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      videoContainerCreatingTaskEpisodeId: row.at(1).value == null ? undefined : row.at(1).value,
      videoContainerCreatingTaskRetryCount: row.at(2).value == null ? undefined : row.at(2).value.value,
      videoContainerCreatingTaskExecutionTimeMs: row.at(3).value == null ? undefined : row.at(3).value.valueOf(),
      videoContainerCreatingTaskCreatedTimeMs: row.at(4).value == null ? undefined : row.at(4).value.valueOf(),
    });
  }
  return resRows;
}

export interface ListPendingVideoContainerCreatingTasksRow {
  videoContainerCreatingTaskSeasonId?: string,
  videoContainerCreatingTaskEpisodeId?: string,
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
  args: {
    videoContainerCreatingTaskExecutionTimeMsLe?: number,
  }
): Promise<Array<ListPendingVideoContainerCreatingTasksRow>> {
  let [rows] = await runner.run({
    sql: "SELECT VideoContainerCreatingTask.seasonId, VideoContainerCreatingTask.episodeId FROM VideoContainerCreatingTask WHERE VideoContainerCreatingTask.executionTimeMs <= @videoContainerCreatingTaskExecutionTimeMsLe",
    params: {
      videoContainerCreatingTaskExecutionTimeMsLe: args.videoContainerCreatingTaskExecutionTimeMsLe == null ? null : new Date(args.videoContainerCreatingTaskExecutionTimeMsLe).toISOString(),
    },
    types: {
      videoContainerCreatingTaskExecutionTimeMsLe: { type: "timestamp" },
    }
  });
  let resRows = new Array<ListPendingVideoContainerCreatingTasksRow>();
  for (let row of rows) {
    resRows.push({
      videoContainerCreatingTaskSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      videoContainerCreatingTaskEpisodeId: row.at(1).value == null ? undefined : row.at(1).value,
    });
  }
  return resRows;
}

export interface GetVideoContainerCreatingTaskMetadataRow {
  videoContainerCreatingTaskRetryCount?: number,
  videoContainerCreatingTaskExecutionTimeMs?: number,
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
  args: {
    videoContainerCreatingTaskSeasonIdEq: string,
    videoContainerCreatingTaskEpisodeIdEq: string,
  }
): Promise<Array<GetVideoContainerCreatingTaskMetadataRow>> {
  let [rows] = await runner.run({
    sql: "SELECT VideoContainerCreatingTask.retryCount, VideoContainerCreatingTask.executionTimeMs FROM VideoContainerCreatingTask WHERE (VideoContainerCreatingTask.seasonId = @videoContainerCreatingTaskSeasonIdEq AND VideoContainerCreatingTask.episodeId = @videoContainerCreatingTaskEpisodeIdEq)",
    params: {
      videoContainerCreatingTaskSeasonIdEq: args.videoContainerCreatingTaskSeasonIdEq,
      videoContainerCreatingTaskEpisodeIdEq: args.videoContainerCreatingTaskEpisodeIdEq,
    },
    types: {
      videoContainerCreatingTaskSeasonIdEq: { type: "string" },
      videoContainerCreatingTaskEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetVideoContainerCreatingTaskMetadataRow>();
  for (let row of rows) {
    resRows.push({
      videoContainerCreatingTaskRetryCount: row.at(0).value == null ? undefined : row.at(0).value.value,
      videoContainerCreatingTaskExecutionTimeMs: row.at(1).value == null ? undefined : row.at(1).value.valueOf(),
    });
  }
  return resRows;
}

export function updateVideoContainerCreatingTaskMetadataStatement(
  args: {
    videoContainerCreatingTaskSeasonIdEq: string,
    videoContainerCreatingTaskEpisodeIdEq: string,
    setRetryCount?: number,
    setExecutionTimeMs?: number,
  }
): Statement {
  return {
    sql: "UPDATE VideoContainerCreatingTask SET retryCount = @setRetryCount, executionTimeMs = @setExecutionTimeMs WHERE (VideoContainerCreatingTask.seasonId = @videoContainerCreatingTaskSeasonIdEq AND VideoContainerCreatingTask.episodeId = @videoContainerCreatingTaskEpisodeIdEq)",
    params: {
      videoContainerCreatingTaskSeasonIdEq: args.videoContainerCreatingTaskSeasonIdEq,
      videoContainerCreatingTaskEpisodeIdEq: args.videoContainerCreatingTaskEpisodeIdEq,
      setRetryCount: args.setRetryCount == null ? null : Spanner.float(args.setRetryCount),
      setExecutionTimeMs: args.setExecutionTimeMs == null ? null : new Date(args.setExecutionTimeMs).toISOString(),
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
  args: {
    videoContainerId: string,
    retryCount?: number,
    executionTimeMs?: number,
    createdTimeMs?: number,
  }
): Statement {
  return {
    sql: "INSERT VideoContainerDeletingTask (videoContainerId, retryCount, executionTimeMs, createdTimeMs) VALUES (@videoContainerId, @retryCount, @executionTimeMs, @createdTimeMs)",
    params: {
      videoContainerId: args.videoContainerId,
      retryCount: args.retryCount == null ? null : Spanner.float(args.retryCount),
      executionTimeMs: args.executionTimeMs == null ? null : new Date(args.executionTimeMs).toISOString(),
      createdTimeMs: args.createdTimeMs == null ? null : new Date(args.createdTimeMs).toISOString(),
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
  args: {
    videoContainerDeletingTaskVideoContainerIdEq: string,
  }
): Statement {
  return {
    sql: "DELETE VideoContainerDeletingTask WHERE (VideoContainerDeletingTask.videoContainerId = @videoContainerDeletingTaskVideoContainerIdEq)",
    params: {
      videoContainerDeletingTaskVideoContainerIdEq: args.videoContainerDeletingTaskVideoContainerIdEq,
    },
    types: {
      videoContainerDeletingTaskVideoContainerIdEq: { type: "string" },
    }
  };
}

export interface GetVideoContainerDeletingTaskRow {
  videoContainerDeletingTaskVideoContainerId?: string,
  videoContainerDeletingTaskRetryCount?: number,
  videoContainerDeletingTaskExecutionTimeMs?: number,
  videoContainerDeletingTaskCreatedTimeMs?: number,
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
  args: {
    videoContainerDeletingTaskVideoContainerIdEq: string,
  }
): Promise<Array<GetVideoContainerDeletingTaskRow>> {
  let [rows] = await runner.run({
    sql: "SELECT VideoContainerDeletingTask.videoContainerId, VideoContainerDeletingTask.retryCount, VideoContainerDeletingTask.executionTimeMs, VideoContainerDeletingTask.createdTimeMs FROM VideoContainerDeletingTask WHERE (VideoContainerDeletingTask.videoContainerId = @videoContainerDeletingTaskVideoContainerIdEq)",
    params: {
      videoContainerDeletingTaskVideoContainerIdEq: args.videoContainerDeletingTaskVideoContainerIdEq,
    },
    types: {
      videoContainerDeletingTaskVideoContainerIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetVideoContainerDeletingTaskRow>();
  for (let row of rows) {
    resRows.push({
      videoContainerDeletingTaskVideoContainerId: row.at(0).value == null ? undefined : row.at(0).value,
      videoContainerDeletingTaskRetryCount: row.at(1).value == null ? undefined : row.at(1).value.value,
      videoContainerDeletingTaskExecutionTimeMs: row.at(2).value == null ? undefined : row.at(2).value.valueOf(),
      videoContainerDeletingTaskCreatedTimeMs: row.at(3).value == null ? undefined : row.at(3).value.valueOf(),
    });
  }
  return resRows;
}

export interface ListPendingVideoContainerDeletingTasksRow {
  videoContainerDeletingTaskVideoContainerId?: string,
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
  args: {
    videoContainerDeletingTaskExecutionTimeMsLe?: number,
  }
): Promise<Array<ListPendingVideoContainerDeletingTasksRow>> {
  let [rows] = await runner.run({
    sql: "SELECT VideoContainerDeletingTask.videoContainerId FROM VideoContainerDeletingTask WHERE VideoContainerDeletingTask.executionTimeMs <= @videoContainerDeletingTaskExecutionTimeMsLe",
    params: {
      videoContainerDeletingTaskExecutionTimeMsLe: args.videoContainerDeletingTaskExecutionTimeMsLe == null ? null : new Date(args.videoContainerDeletingTaskExecutionTimeMsLe).toISOString(),
    },
    types: {
      videoContainerDeletingTaskExecutionTimeMsLe: { type: "timestamp" },
    }
  });
  let resRows = new Array<ListPendingVideoContainerDeletingTasksRow>();
  for (let row of rows) {
    resRows.push({
      videoContainerDeletingTaskVideoContainerId: row.at(0).value == null ? undefined : row.at(0).value,
    });
  }
  return resRows;
}

export interface GetVideoContainerDeletingTaskMetadataRow {
  videoContainerDeletingTaskRetryCount?: number,
  videoContainerDeletingTaskExecutionTimeMs?: number,
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
  args: {
    videoContainerDeletingTaskVideoContainerIdEq: string,
  }
): Promise<Array<GetVideoContainerDeletingTaskMetadataRow>> {
  let [rows] = await runner.run({
    sql: "SELECT VideoContainerDeletingTask.retryCount, VideoContainerDeletingTask.executionTimeMs FROM VideoContainerDeletingTask WHERE (VideoContainerDeletingTask.videoContainerId = @videoContainerDeletingTaskVideoContainerIdEq)",
    params: {
      videoContainerDeletingTaskVideoContainerIdEq: args.videoContainerDeletingTaskVideoContainerIdEq,
    },
    types: {
      videoContainerDeletingTaskVideoContainerIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetVideoContainerDeletingTaskMetadataRow>();
  for (let row of rows) {
    resRows.push({
      videoContainerDeletingTaskRetryCount: row.at(0).value == null ? undefined : row.at(0).value.value,
      videoContainerDeletingTaskExecutionTimeMs: row.at(1).value == null ? undefined : row.at(1).value.valueOf(),
    });
  }
  return resRows;
}

export function updateVideoContainerDeletingTaskMetadataStatement(
  args: {
    videoContainerDeletingTaskVideoContainerIdEq: string,
    setRetryCount?: number,
    setExecutionTimeMs?: number,
  }
): Statement {
  return {
    sql: "UPDATE VideoContainerDeletingTask SET retryCount = @setRetryCount, executionTimeMs = @setExecutionTimeMs WHERE (VideoContainerDeletingTask.videoContainerId = @videoContainerDeletingTaskVideoContainerIdEq)",
    params: {
      videoContainerDeletingTaskVideoContainerIdEq: args.videoContainerDeletingTaskVideoContainerIdEq,
      setRetryCount: args.setRetryCount == null ? null : Spanner.float(args.setRetryCount),
      setExecutionTimeMs: args.setExecutionTimeMs == null ? null : new Date(args.setExecutionTimeMs).toISOString(),
    },
    types: {
      videoContainerDeletingTaskVideoContainerIdEq: { type: "string" },
      setRetryCount: { type: "float64" },
      setExecutionTimeMs: { type: "timestamp" },
    }
  };
}

export function insertCoverImageDeletingTaskStatement(
  args: {
    r2Filename: string,
    retryCount?: number,
    executionTimeMs?: number,
    createdTimeMs?: number,
  }
): Statement {
  return {
    sql: "INSERT CoverImageDeletingTask (r2Filename, retryCount, executionTimeMs, createdTimeMs) VALUES (@r2Filename, @retryCount, @executionTimeMs, @createdTimeMs)",
    params: {
      r2Filename: args.r2Filename,
      retryCount: args.retryCount == null ? null : Spanner.float(args.retryCount),
      executionTimeMs: args.executionTimeMs == null ? null : new Date(args.executionTimeMs).toISOString(),
      createdTimeMs: args.createdTimeMs == null ? null : new Date(args.createdTimeMs).toISOString(),
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
  args: {
    coverImageDeletingTaskR2FilenameEq: string,
  }
): Statement {
  return {
    sql: "DELETE CoverImageDeletingTask WHERE (CoverImageDeletingTask.r2Filename = @coverImageDeletingTaskR2FilenameEq)",
    params: {
      coverImageDeletingTaskR2FilenameEq: args.coverImageDeletingTaskR2FilenameEq,
    },
    types: {
      coverImageDeletingTaskR2FilenameEq: { type: "string" },
    }
  };
}

export interface GetCoverImageDeletingTaskRow {
  coverImageDeletingTaskR2Filename?: string,
  coverImageDeletingTaskRetryCount?: number,
  coverImageDeletingTaskExecutionTimeMs?: number,
  coverImageDeletingTaskCreatedTimeMs?: number,
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
  args: {
    coverImageDeletingTaskR2FilenameEq: string,
  }
): Promise<Array<GetCoverImageDeletingTaskRow>> {
  let [rows] = await runner.run({
    sql: "SELECT CoverImageDeletingTask.r2Filename, CoverImageDeletingTask.retryCount, CoverImageDeletingTask.executionTimeMs, CoverImageDeletingTask.createdTimeMs FROM CoverImageDeletingTask WHERE (CoverImageDeletingTask.r2Filename = @coverImageDeletingTaskR2FilenameEq)",
    params: {
      coverImageDeletingTaskR2FilenameEq: args.coverImageDeletingTaskR2FilenameEq,
    },
    types: {
      coverImageDeletingTaskR2FilenameEq: { type: "string" },
    }
  });
  let resRows = new Array<GetCoverImageDeletingTaskRow>();
  for (let row of rows) {
    resRows.push({
      coverImageDeletingTaskR2Filename: row.at(0).value == null ? undefined : row.at(0).value,
      coverImageDeletingTaskRetryCount: row.at(1).value == null ? undefined : row.at(1).value.value,
      coverImageDeletingTaskExecutionTimeMs: row.at(2).value == null ? undefined : row.at(2).value.valueOf(),
      coverImageDeletingTaskCreatedTimeMs: row.at(3).value == null ? undefined : row.at(3).value.valueOf(),
    });
  }
  return resRows;
}

export interface ListPendingCoverImageDeletingTasksRow {
  coverImageDeletingTaskR2Filename?: string,
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
  args: {
    coverImageDeletingTaskExecutionTimeMsLe?: number,
  }
): Promise<Array<ListPendingCoverImageDeletingTasksRow>> {
  let [rows] = await runner.run({
    sql: "SELECT CoverImageDeletingTask.r2Filename FROM CoverImageDeletingTask WHERE CoverImageDeletingTask.executionTimeMs <= @coverImageDeletingTaskExecutionTimeMsLe",
    params: {
      coverImageDeletingTaskExecutionTimeMsLe: args.coverImageDeletingTaskExecutionTimeMsLe == null ? null : new Date(args.coverImageDeletingTaskExecutionTimeMsLe).toISOString(),
    },
    types: {
      coverImageDeletingTaskExecutionTimeMsLe: { type: "timestamp" },
    }
  });
  let resRows = new Array<ListPendingCoverImageDeletingTasksRow>();
  for (let row of rows) {
    resRows.push({
      coverImageDeletingTaskR2Filename: row.at(0).value == null ? undefined : row.at(0).value,
    });
  }
  return resRows;
}

export interface GetCoverImageDeletingTaskMetadataRow {
  coverImageDeletingTaskRetryCount?: number,
  coverImageDeletingTaskExecutionTimeMs?: number,
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
  args: {
    coverImageDeletingTaskR2FilenameEq: string,
  }
): Promise<Array<GetCoverImageDeletingTaskMetadataRow>> {
  let [rows] = await runner.run({
    sql: "SELECT CoverImageDeletingTask.retryCount, CoverImageDeletingTask.executionTimeMs FROM CoverImageDeletingTask WHERE (CoverImageDeletingTask.r2Filename = @coverImageDeletingTaskR2FilenameEq)",
    params: {
      coverImageDeletingTaskR2FilenameEq: args.coverImageDeletingTaskR2FilenameEq,
    },
    types: {
      coverImageDeletingTaskR2FilenameEq: { type: "string" },
    }
  });
  let resRows = new Array<GetCoverImageDeletingTaskMetadataRow>();
  for (let row of rows) {
    resRows.push({
      coverImageDeletingTaskRetryCount: row.at(0).value == null ? undefined : row.at(0).value.value,
      coverImageDeletingTaskExecutionTimeMs: row.at(1).value == null ? undefined : row.at(1).value.valueOf(),
    });
  }
  return resRows;
}

export function updateCoverImageDeletingTaskMetadataStatement(
  args: {
    coverImageDeletingTaskR2FilenameEq: string,
    setRetryCount?: number,
    setExecutionTimeMs?: number,
  }
): Statement {
  return {
    sql: "UPDATE CoverImageDeletingTask SET retryCount = @setRetryCount, executionTimeMs = @setExecutionTimeMs WHERE (CoverImageDeletingTask.r2Filename = @coverImageDeletingTaskR2FilenameEq)",
    params: {
      coverImageDeletingTaskR2FilenameEq: args.coverImageDeletingTaskR2FilenameEq,
      setRetryCount: args.setRetryCount == null ? null : Spanner.float(args.setRetryCount),
      setExecutionTimeMs: args.setExecutionTimeMs == null ? null : new Date(args.setExecutionTimeMs).toISOString(),
    },
    types: {
      coverImageDeletingTaskR2FilenameEq: { type: "string" },
      setRetryCount: { type: "float64" },
      setExecutionTimeMs: { type: "timestamp" },
    }
  };
}

export function insertSeasonRecentPremiereTimeUpdatingTaskStatement(
  args: {
    seasonId: string,
    episodeId: string,
    retryCount?: number,
    executionTimeMs?: number,
    createdTimeMs?: number,
  }
): Statement {
  return {
    sql: "INSERT SeasonRecentPremiereTimeUpdatingTask (seasonId, episodeId, retryCount, executionTimeMs, createdTimeMs) VALUES (@seasonId, @episodeId, @retryCount, @executionTimeMs, @createdTimeMs)",
    params: {
      seasonId: args.seasonId,
      episodeId: args.episodeId,
      retryCount: args.retryCount == null ? null : Spanner.float(args.retryCount),
      executionTimeMs: args.executionTimeMs == null ? null : new Date(args.executionTimeMs).toISOString(),
      createdTimeMs: args.createdTimeMs == null ? null : new Date(args.createdTimeMs).toISOString(),
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

export function deleteSeasonRecentPremiereTimeUpdatingTaskStatement(
  args: {
    seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: string,
    seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: string,
  }
): Statement {
  return {
    sql: "DELETE SeasonRecentPremiereTimeUpdatingTask WHERE (SeasonRecentPremiereTimeUpdatingTask.seasonId = @seasonRecentPremiereTimeUpdatingTaskSeasonIdEq AND SeasonRecentPremiereTimeUpdatingTask.episodeId = @seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq)",
    params: {
      seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: args.seasonRecentPremiereTimeUpdatingTaskSeasonIdEq,
      seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: args.seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq,
    },
    types: {
      seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: { type: "string" },
      seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: { type: "string" },
    }
  };
}

export interface GetSeasonRecentPremiereTimeUpdatingTaskRow {
  seasonRecentPremiereTimeUpdatingTaskSeasonId?: string,
  seasonRecentPremiereTimeUpdatingTaskEpisodeId?: string,
  seasonRecentPremiereTimeUpdatingTaskRetryCount?: number,
  seasonRecentPremiereTimeUpdatingTaskExecutionTimeMs?: number,
  seasonRecentPremiereTimeUpdatingTaskCreatedTimeMs?: number,
}

export let GET_SEASON_RECENT_PREMIERE_TIME_UPDATING_TASK_ROW: MessageDescriptor<GetSeasonRecentPremiereTimeUpdatingTaskRow> = {
  name: 'GetSeasonRecentPremiereTimeUpdatingTaskRow',
  fields: [{
    name: 'seasonRecentPremiereTimeUpdatingTaskSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonRecentPremiereTimeUpdatingTaskEpisodeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonRecentPremiereTimeUpdatingTaskRetryCount',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeUpdatingTaskExecutionTimeMs',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeUpdatingTaskCreatedTimeMs',
    index: 5,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getSeasonRecentPremiereTimeUpdatingTask(
  runner: Database | Transaction,
  args: {
    seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: string,
    seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: string,
  }
): Promise<Array<GetSeasonRecentPremiereTimeUpdatingTaskRow>> {
  let [rows] = await runner.run({
    sql: "SELECT SeasonRecentPremiereTimeUpdatingTask.seasonId, SeasonRecentPremiereTimeUpdatingTask.episodeId, SeasonRecentPremiereTimeUpdatingTask.retryCount, SeasonRecentPremiereTimeUpdatingTask.executionTimeMs, SeasonRecentPremiereTimeUpdatingTask.createdTimeMs FROM SeasonRecentPremiereTimeUpdatingTask WHERE (SeasonRecentPremiereTimeUpdatingTask.seasonId = @seasonRecentPremiereTimeUpdatingTaskSeasonIdEq AND SeasonRecentPremiereTimeUpdatingTask.episodeId = @seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq)",
    params: {
      seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: args.seasonRecentPremiereTimeUpdatingTaskSeasonIdEq,
      seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: args.seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq,
    },
    types: {
      seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: { type: "string" },
      seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonRecentPremiereTimeUpdatingTaskRow>();
  for (let row of rows) {
    resRows.push({
      seasonRecentPremiereTimeUpdatingTaskSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonRecentPremiereTimeUpdatingTaskEpisodeId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonRecentPremiereTimeUpdatingTaskRetryCount: row.at(2).value == null ? undefined : row.at(2).value.value,
      seasonRecentPremiereTimeUpdatingTaskExecutionTimeMs: row.at(3).value == null ? undefined : row.at(3).value.valueOf(),
      seasonRecentPremiereTimeUpdatingTaskCreatedTimeMs: row.at(4).value == null ? undefined : row.at(4).value.valueOf(),
    });
  }
  return resRows;
}

export interface ListPendingSeasonRecentPremiereTimeUpdatingTasksRow {
  seasonRecentPremiereTimeUpdatingTaskSeasonId?: string,
  seasonRecentPremiereTimeUpdatingTaskEpisodeId?: string,
}

export let LIST_PENDING_SEASON_RECENT_PREMIERE_TIME_UPDATING_TASKS_ROW: MessageDescriptor<ListPendingSeasonRecentPremiereTimeUpdatingTasksRow> = {
  name: 'ListPendingSeasonRecentPremiereTimeUpdatingTasksRow',
  fields: [{
    name: 'seasonRecentPremiereTimeUpdatingTaskSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonRecentPremiereTimeUpdatingTaskEpisodeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }],
};

export async function listPendingSeasonRecentPremiereTimeUpdatingTasks(
  runner: Database | Transaction,
  args: {
    seasonRecentPremiereTimeUpdatingTaskExecutionTimeMsLe?: number,
  }
): Promise<Array<ListPendingSeasonRecentPremiereTimeUpdatingTasksRow>> {
  let [rows] = await runner.run({
    sql: "SELECT SeasonRecentPremiereTimeUpdatingTask.seasonId, SeasonRecentPremiereTimeUpdatingTask.episodeId FROM SeasonRecentPremiereTimeUpdatingTask WHERE SeasonRecentPremiereTimeUpdatingTask.executionTimeMs <= @seasonRecentPremiereTimeUpdatingTaskExecutionTimeMsLe",
    params: {
      seasonRecentPremiereTimeUpdatingTaskExecutionTimeMsLe: args.seasonRecentPremiereTimeUpdatingTaskExecutionTimeMsLe == null ? null : new Date(args.seasonRecentPremiereTimeUpdatingTaskExecutionTimeMsLe).toISOString(),
    },
    types: {
      seasonRecentPremiereTimeUpdatingTaskExecutionTimeMsLe: { type: "timestamp" },
    }
  });
  let resRows = new Array<ListPendingSeasonRecentPremiereTimeUpdatingTasksRow>();
  for (let row of rows) {
    resRows.push({
      seasonRecentPremiereTimeUpdatingTaskSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonRecentPremiereTimeUpdatingTaskEpisodeId: row.at(1).value == null ? undefined : row.at(1).value,
    });
  }
  return resRows;
}

export interface GetSeasonRecentPremiereTimeUpdatingTaskMetadataRow {
  seasonRecentPremiereTimeUpdatingTaskRetryCount?: number,
  seasonRecentPremiereTimeUpdatingTaskExecutionTimeMs?: number,
}

export let GET_SEASON_RECENT_PREMIERE_TIME_UPDATING_TASK_METADATA_ROW: MessageDescriptor<GetSeasonRecentPremiereTimeUpdatingTaskMetadataRow> = {
  name: 'GetSeasonRecentPremiereTimeUpdatingTaskMetadataRow',
  fields: [{
    name: 'seasonRecentPremiereTimeUpdatingTaskRetryCount',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeUpdatingTaskExecutionTimeMs',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getSeasonRecentPremiereTimeUpdatingTaskMetadata(
  runner: Database | Transaction,
  args: {
    seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: string,
    seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: string,
  }
): Promise<Array<GetSeasonRecentPremiereTimeUpdatingTaskMetadataRow>> {
  let [rows] = await runner.run({
    sql: "SELECT SeasonRecentPremiereTimeUpdatingTask.retryCount, SeasonRecentPremiereTimeUpdatingTask.executionTimeMs FROM SeasonRecentPremiereTimeUpdatingTask WHERE (SeasonRecentPremiereTimeUpdatingTask.seasonId = @seasonRecentPremiereTimeUpdatingTaskSeasonIdEq AND SeasonRecentPremiereTimeUpdatingTask.episodeId = @seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq)",
    params: {
      seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: args.seasonRecentPremiereTimeUpdatingTaskSeasonIdEq,
      seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: args.seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq,
    },
    types: {
      seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: { type: "string" },
      seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonRecentPremiereTimeUpdatingTaskMetadataRow>();
  for (let row of rows) {
    resRows.push({
      seasonRecentPremiereTimeUpdatingTaskRetryCount: row.at(0).value == null ? undefined : row.at(0).value.value,
      seasonRecentPremiereTimeUpdatingTaskExecutionTimeMs: row.at(1).value == null ? undefined : row.at(1).value.valueOf(),
    });
  }
  return resRows;
}

export function updateSeasonRecentPremiereTimeUpdatingTaskMetadataStatement(
  args: {
    seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: string,
    seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: string,
    setRetryCount?: number,
    setExecutionTimeMs?: number,
  }
): Statement {
  return {
    sql: "UPDATE SeasonRecentPremiereTimeUpdatingTask SET retryCount = @setRetryCount, executionTimeMs = @setExecutionTimeMs WHERE (SeasonRecentPremiereTimeUpdatingTask.seasonId = @seasonRecentPremiereTimeUpdatingTaskSeasonIdEq AND SeasonRecentPremiereTimeUpdatingTask.episodeId = @seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq)",
    params: {
      seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: args.seasonRecentPremiereTimeUpdatingTaskSeasonIdEq,
      seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: args.seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq,
      setRetryCount: args.setRetryCount == null ? null : Spanner.float(args.setRetryCount),
      setExecutionTimeMs: args.setExecutionTimeMs == null ? null : new Date(args.setExecutionTimeMs).toISOString(),
    },
    types: {
      seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: { type: "string" },
      seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: { type: "string" },
      setRetryCount: { type: "float64" },
      setExecutionTimeMs: { type: "timestamp" },
    }
  };
}

export function updateSeasonLastChangeTimeStatement(
  args: {
    seasonSeasonIdEq: string,
    setLastChangeTimeMs?: number,
  }
): Statement {
  return {
    sql: "UPDATE Season SET lastChangeTimeMs = @setLastChangeTimeMs WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: args.seasonSeasonIdEq,
      setLastChangeTimeMs: args.setLastChangeTimeMs == null ? null : Spanner.float(args.setLastChangeTimeMs),
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
      setLastChangeTimeMs: { type: "float64" },
    }
  };
}

export function archiveSeasonStatement(
  args: {
    seasonSeasonIdEq: string,
    setState?: SeasonState,
    setCoverImageR2Filename?: string,
    setLastChangeTimeMs?: number,
  }
): Statement {
  return {
    sql: "UPDATE Season SET state = @setState, coverImageR2Filename = @setCoverImageR2Filename, lastChangeTimeMs = @setLastChangeTimeMs WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: args.seasonSeasonIdEq,
      setState: args.setState == null ? null : Spanner.float(args.setState),
      setCoverImageR2Filename: args.setCoverImageR2Filename == null ? null : args.setCoverImageR2Filename,
      setLastChangeTimeMs: args.setLastChangeTimeMs == null ? null : Spanner.float(args.setLastChangeTimeMs),
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
      setState: { type: "float64" },
      setCoverImageR2Filename: { type: "string" },
      setLastChangeTimeMs: { type: "float64" },
    }
  };
}

export function updateSeasonTotalEpisodesStatement(
  args: {
    seasonSeasonIdEq: string,
    setTotalEpisodes?: number,
    setLastChangeTimeMs?: number,
  }
): Statement {
  return {
    sql: "UPDATE Season SET totalEpisodes = @setTotalEpisodes, lastChangeTimeMs = @setLastChangeTimeMs WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: args.seasonSeasonIdEq,
      setTotalEpisodes: args.setTotalEpisodes == null ? null : Spanner.float(args.setTotalEpisodes),
      setLastChangeTimeMs: args.setLastChangeTimeMs == null ? null : Spanner.float(args.setLastChangeTimeMs),
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
      setTotalEpisodes: { type: "float64" },
      setLastChangeTimeMs: { type: "float64" },
    }
  };
}

export function publishSeasonStatement(
  args: {
    seasonSeasonIdEq: string,
    setState?: SeasonState,
    setLastChangeTimeMs?: number,
  }
): Statement {
  return {
    sql: "UPDATE Season SET state = @setState, lastChangeTimeMs = @setLastChangeTimeMs WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: args.seasonSeasonIdEq,
      setState: args.setState == null ? null : Spanner.float(args.setState),
      setLastChangeTimeMs: args.setLastChangeTimeMs == null ? null : Spanner.float(args.setLastChangeTimeMs),
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
      setState: { type: "float64" },
      setLastChangeTimeMs: { type: "float64" },
    }
  };
}

export function updateSeasonRecentPremiereTimeStatement(
  args: {
    seasonSeasonIdEq: string,
    setRecentPremiereTimeMs?: number,
  }
): Statement {
  return {
    sql: "UPDATE Season SET recentPremiereTimeMs = @setRecentPremiereTimeMs WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: args.seasonSeasonIdEq,
      setRecentPremiereTimeMs: args.setRecentPremiereTimeMs == null ? null : Spanner.float(args.setRecentPremiereTimeMs),
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
      setRecentPremiereTimeMs: { type: "float64" },
    }
  };
}

export function updateSeasonNameAndDescriptionStatement(
  args: {
    seasonSeasonIdEq: string,
    setName?: string,
    setDescription?: string,
    setLastChangeTimeMs?: number,
  }
): Statement {
  return {
    sql: "UPDATE Season SET name = @setName, description = @setDescription, lastChangeTimeMs = @setLastChangeTimeMs WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: args.seasonSeasonIdEq,
      setName: args.setName == null ? null : args.setName,
      setDescription: args.setDescription == null ? null : args.setDescription,
      setLastChangeTimeMs: args.setLastChangeTimeMs == null ? null : Spanner.float(args.setLastChangeTimeMs),
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
      setName: { type: "string" },
      setDescription: { type: "string" },
      setLastChangeTimeMs: { type: "float64" },
    }
  };
}

export function updateSeasonCoverImageStatement(
  args: {
    seasonSeasonIdEq: string,
    setCoverImageR2Filename?: string,
    setLastChangeTimeMs?: number,
  }
): Statement {
  return {
    sql: "UPDATE Season SET coverImageR2Filename = @setCoverImageR2Filename, lastChangeTimeMs = @setLastChangeTimeMs WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: args.seasonSeasonIdEq,
      setCoverImageR2Filename: args.setCoverImageR2Filename == null ? null : args.setCoverImageR2Filename,
      setLastChangeTimeMs: args.setLastChangeTimeMs == null ? null : Spanner.float(args.setLastChangeTimeMs),
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
      setCoverImageR2Filename: { type: "string" },
      setLastChangeTimeMs: { type: "float64" },
    }
  };
}

export function updateSeasonRatingStatement(
  args: {
    seasonSeasonIdEq: string,
    setTotalRatings?: number,
    setRatingsCount?: number,
    setAverageRating?: number,
    setRatingUpdatedTimeMs?: number,
  }
): Statement {
  return {
    sql: "UPDATE Season SET totalRatings = @setTotalRatings, ratingsCount = @setRatingsCount, averageRating = @setAverageRating, ratingUpdatedTimeMs = @setRatingUpdatedTimeMs WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: args.seasonSeasonIdEq,
      setTotalRatings: args.setTotalRatings == null ? null : Spanner.float(args.setTotalRatings),
      setRatingsCount: args.setRatingsCount == null ? null : Spanner.float(args.setRatingsCount),
      setAverageRating: args.setAverageRating == null ? null : Spanner.float(args.setAverageRating),
      setRatingUpdatedTimeMs: args.setRatingUpdatedTimeMs == null ? null : Spanner.float(args.setRatingUpdatedTimeMs),
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
      setTotalRatings: { type: "float64" },
      setRatingsCount: { type: "float64" },
      setAverageRating: { type: "float64" },
      setRatingUpdatedTimeMs: { type: "float64" },
    }
  };
}

export function updateSeasonGradeStatement(
  args: {
    seasonGradeSeasonIdEq: string,
    seasonGradeGradeIdEq: string,
    setGrade?: number,
  }
): Statement {
  return {
    sql: "UPDATE SeasonGrade SET grade = @setGrade WHERE (SeasonGrade.seasonId = @seasonGradeSeasonIdEq AND SeasonGrade.gradeId = @seasonGradeGradeIdEq)",
    params: {
      seasonGradeSeasonIdEq: args.seasonGradeSeasonIdEq,
      seasonGradeGradeIdEq: args.seasonGradeGradeIdEq,
      setGrade: args.setGrade == null ? null : Spanner.float(args.setGrade),
    },
    types: {
      seasonGradeSeasonIdEq: { type: "string" },
      seasonGradeGradeIdEq: { type: "string" },
      setGrade: { type: "float64" },
    }
  };
}

export function updateSeasonGradeEndDateStatement(
  args: {
    seasonGradeSeasonIdEq: string,
    seasonGradeGradeIdEq: string,
    setEndDate?: string,
  }
): Statement {
  return {
    sql: "UPDATE SeasonGrade SET endDate = @setEndDate WHERE (SeasonGrade.seasonId = @seasonGradeSeasonIdEq AND SeasonGrade.gradeId = @seasonGradeGradeIdEq)",
    params: {
      seasonGradeSeasonIdEq: args.seasonGradeSeasonIdEq,
      seasonGradeGradeIdEq: args.seasonGradeGradeIdEq,
      setEndDate: args.setEndDate == null ? null : args.setEndDate,
    },
    types: {
      seasonGradeSeasonIdEq: { type: "string" },
      seasonGradeGradeIdEq: { type: "string" },
      setEndDate: { type: "string" },
    }
  };
}

export function updateSeasonGradeStartDateAndGradeStatement(
  args: {
    seasonGradeSeasonIdEq: string,
    seasonGradeGradeIdEq: string,
    setStartDate?: string,
    setGrade?: number,
  }
): Statement {
  return {
    sql: "UPDATE SeasonGrade SET startDate = @setStartDate, grade = @setGrade WHERE (SeasonGrade.seasonId = @seasonGradeSeasonIdEq AND SeasonGrade.gradeId = @seasonGradeGradeIdEq)",
    params: {
      seasonGradeSeasonIdEq: args.seasonGradeSeasonIdEq,
      seasonGradeGradeIdEq: args.seasonGradeGradeIdEq,
      setStartDate: args.setStartDate == null ? null : args.setStartDate,
      setGrade: args.setGrade == null ? null : Spanner.float(args.setGrade),
    },
    types: {
      seasonGradeSeasonIdEq: { type: "string" },
      seasonGradeGradeIdEq: { type: "string" },
      setStartDate: { type: "string" },
      setGrade: { type: "float64" },
    }
  };
}

export function updateEpisodeVideoContainerIdStatement(
  args: {
    episodeSeasonIdEq: string,
    episodeEpisodeIdEq: string,
    setVideoContainerId?: string,
  }
): Statement {
  return {
    sql: "UPDATE Episode SET videoContainerId = @setVideoContainerId WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
    params: {
      episodeSeasonIdEq: args.episodeSeasonIdEq,
      episodeEpisodeIdEq: args.episodeEpisodeIdEq,
      setVideoContainerId: args.setVideoContainerId == null ? null : args.setVideoContainerId,
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
      setVideoContainerId: { type: "string" },
    }
  };
}

export function updateEpisodeVideoContainerStatement(
  args: {
    episodeSeasonIdEq: string,
    episodeEpisodeIdEq: string,
    setVideoContainer?: VideoContainer,
  }
): Statement {
  return {
    sql: "UPDATE Episode SET videoContainer = @setVideoContainer WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
    params: {
      episodeSeasonIdEq: args.episodeSeasonIdEq,
      episodeEpisodeIdEq: args.episodeEpisodeIdEq,
      setVideoContainer: args.setVideoContainer == null ? null : Buffer.from(serializeMessage(args.setVideoContainer, VIDEO_CONTAINER).buffer),
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
      setVideoContainer: { type: "bytes" },
    }
  };
}

export function updateEpisodeIndexStatement(
  args: {
    episodeSeasonIdEq: string,
    episodeEpisodeIdEq: string,
    setIndex?: number,
  }
): Statement {
  return {
    sql: "UPDATE Episode SET index = @setIndex WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
    params: {
      episodeSeasonIdEq: args.episodeSeasonIdEq,
      episodeEpisodeIdEq: args.episodeEpisodeIdEq,
      setIndex: args.setIndex == null ? null : Spanner.float(args.setIndex),
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
      setIndex: { type: "float64" },
    }
  };
}

export function publishEpisodeStatement(
  args: {
    episodeSeasonIdEq: string,
    episodeEpisodeIdEq: string,
    setState?: EpisodeState,
    setPremiereTimeMs?: number,
  }
): Statement {
  return {
    sql: "UPDATE Episode SET state = @setState, premiereTimeMs = @setPremiereTimeMs WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
    params: {
      episodeSeasonIdEq: args.episodeSeasonIdEq,
      episodeEpisodeIdEq: args.episodeEpisodeIdEq,
      setState: args.setState == null ? null : Spanner.float(args.setState),
      setPremiereTimeMs: args.setPremiereTimeMs == null ? null : Spanner.float(args.setPremiereTimeMs),
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
      setState: { type: "float64" },
      setPremiereTimeMs: { type: "float64" },
    }
  };
}

export function updateEpisodeInfoStatement(
  args: {
    episodeSeasonIdEq: string,
    episodeEpisodeIdEq: string,
    setName?: string,
  }
): Statement {
  return {
    sql: "UPDATE Episode SET name = @setName WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
    params: {
      episodeSeasonIdEq: args.episodeSeasonIdEq,
      episodeEpisodeIdEq: args.episodeEpisodeIdEq,
      setName: args.setName == null ? null : args.setName,
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
      setName: { type: "string" },
    }
  };
}

export function deleteAllEpisodesStatement(
  args: {
    episodeSeasonIdEq: string,
  }
): Statement {
  return {
    sql: "DELETE Episode WHERE Episode.seasonId = @episodeSeasonIdEq",
    params: {
      episodeSeasonIdEq: args.episodeSeasonIdEq,
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
    }
  };
}

export function deleteSeasonRecentPremiereTimeUpdatingTasksOfSeasonStatement(
  args: {
    seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: string,
  }
): Statement {
  return {
    sql: "DELETE SeasonRecentPremiereTimeUpdatingTask WHERE SeasonRecentPremiereTimeUpdatingTask.seasonId = @seasonRecentPremiereTimeUpdatingTaskSeasonIdEq",
    params: {
      seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: args.seasonRecentPremiereTimeUpdatingTaskSeasonIdEq,
    },
    types: {
      seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: { type: "string" },
    }
  };
}

export interface CheckPresenceOfSeasonRow {
  seasonLastChangeTimeMs?: number,
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
  args: {
    seasonSeasonIdEq: string,
  }
): Promise<Array<CheckPresenceOfSeasonRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.lastChangeTimeMs FROM Season WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: args.seasonSeasonIdEq,
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<CheckPresenceOfSeasonRow>();
  for (let row of rows) {
    resRows.push({
      seasonLastChangeTimeMs: row.at(0).value == null ? undefined : row.at(0).value.value,
    });
  }
  return resRows;
}

export interface GetSeasonPublisherRow {
  seasonPublisherId?: string,
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
  args: {
    seasonSeasonIdEq: string,
  }
): Promise<Array<GetSeasonPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.publisherId FROM Season WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: args.seasonSeasonIdEq,
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonPublisherRow>();
  for (let row of rows) {
    resRows.push({
      seasonPublisherId: row.at(0).value == null ? undefined : row.at(0).value,
    });
  }
  return resRows;
}

export interface GetSeasonRecentPremiereTimeRow {
  seasonRecentPremiereTimeMs?: number,
}

export let GET_SEASON_RECENT_PREMIERE_TIME_ROW: MessageDescriptor<GetSeasonRecentPremiereTimeRow> = {
  name: 'GetSeasonRecentPremiereTimeRow',
  fields: [{
    name: 'seasonRecentPremiereTimeMs',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getSeasonRecentPremiereTime(
  runner: Database | Transaction,
  args: {
    seasonSeasonIdEq: string,
  }
): Promise<Array<GetSeasonRecentPremiereTimeRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.recentPremiereTimeMs FROM Season WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: args.seasonSeasonIdEq,
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonRecentPremiereTimeRow>();
  for (let row of rows) {
    resRows.push({
      seasonRecentPremiereTimeMs: row.at(0).value == null ? undefined : row.at(0).value.value,
    });
  }
  return resRows;
}

export interface GetSeasonForPublisherRow {
  seasonSeasonId?: string,
  seasonPublisherId?: string,
  seasonState?: SeasonState,
  seasonName?: string,
  seasonCoverImageR2Filename?: string,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimeMs?: number,
  seasonRecentPremiereTimeMs?: number,
  seasonRatingsCount?: number,
  seasonAverageRating?: number,
}

export let GET_SEASON_FOR_PUBLISHER_ROW: MessageDescriptor<GetSeasonForPublisherRow> = {
  name: 'GetSeasonForPublisherRow',
  fields: [{
    name: 'seasonSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'seasonName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingsCount',
    index: 9,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonAverageRating',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getSeasonForPublisher(
  runner: Database | Transaction,
  args: {
    seasonPublisherIdEq?: string,
    seasonSeasonIdEq: string,
  }
): Promise<Array<GetSeasonForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.seasonId, Season.publisherId, Season.state, Season.name, Season.coverImageR2Filename, Season.totalEpisodes, Season.lastChangeTimeMs, Season.recentPremiereTimeMs, Season.ratingsCount, Season.averageRating FROM Season WHERE (Season.publisherId = @seasonPublisherIdEq AND Season.seasonId = @seasonSeasonIdEq)",
    params: {
      seasonPublisherIdEq: args.seasonPublisherIdEq == null ? null : args.seasonPublisherIdEq,
      seasonSeasonIdEq: args.seasonSeasonIdEq,
    },
    types: {
      seasonPublisherIdEq: { type: "string" },
      seasonSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonForPublisherRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      seasonName: row.at(3).value == null ? undefined : row.at(3).value,
      seasonCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      seasonTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      seasonLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      seasonRecentPremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      seasonRatingsCount: row.at(8).value == null ? undefined : row.at(8).value.value,
      seasonAverageRating: row.at(9).value == null ? undefined : row.at(9).value.value,
    });
  }
  return resRows;
}

export interface GetSeasonAllForPublisherRow {
  seasonSeasonId?: string,
  seasonPublisherId?: string,
  seasonState?: SeasonState,
  seasonName?: string,
  seasonCoverImageR2Filename?: string,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimeMs?: number,
  seasonRecentPremiereTimeMs?: number,
  seasonDescription?: string,
  seasonCreatedTimeMs?: number,
  seasonTotalRatings?: number,
  seasonRatingsCount?: number,
  seasonAverageRating?: number,
  seasonRatingUpdatedTimeMs?: number,
}

export let GET_SEASON_ALL_FOR_PUBLISHER_ROW: MessageDescriptor<GetSeasonAllForPublisherRow> = {
  name: 'GetSeasonAllForPublisherRow',
  fields: [{
    name: 'seasonSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'seasonName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonDescription',
    index: 9,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCreatedTimeMs',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonTotalRatings',
    index: 11,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingsCount',
    index: 12,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonAverageRating',
    index: 13,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingUpdatedTimeMs',
    index: 14,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getSeasonAllForPublisher(
  runner: Database | Transaction,
  args: {
    seasonPublisherIdEq?: string,
    seasonSeasonIdEq: string,
  }
): Promise<Array<GetSeasonAllForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.seasonId, Season.publisherId, Season.state, Season.name, Season.coverImageR2Filename, Season.totalEpisodes, Season.lastChangeTimeMs, Season.recentPremiereTimeMs, Season.description, Season.createdTimeMs, Season.totalRatings, Season.ratingsCount, Season.averageRating, Season.ratingUpdatedTimeMs FROM Season WHERE (Season.publisherId = @seasonPublisherIdEq AND Season.seasonId = @seasonSeasonIdEq)",
    params: {
      seasonPublisherIdEq: args.seasonPublisherIdEq == null ? null : args.seasonPublisherIdEq,
      seasonSeasonIdEq: args.seasonSeasonIdEq,
    },
    types: {
      seasonPublisherIdEq: { type: "string" },
      seasonSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonAllForPublisherRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      seasonName: row.at(3).value == null ? undefined : row.at(3).value,
      seasonCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      seasonTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      seasonLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      seasonRecentPremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      seasonDescription: row.at(8).value == null ? undefined : row.at(8).value,
      seasonCreatedTimeMs: row.at(9).value == null ? undefined : row.at(9).value.valueOf(),
      seasonTotalRatings: row.at(10).value == null ? undefined : row.at(10).value.value,
      seasonRatingsCount: row.at(11).value == null ? undefined : row.at(11).value.value,
      seasonAverageRating: row.at(12).value == null ? undefined : row.at(12).value.value,
      seasonRatingUpdatedTimeMs: row.at(13).value == null ? undefined : row.at(13).value.value,
    });
  }
  return resRows;
}

export interface ListSeasonsForPublisherRow {
  seasonSeasonId?: string,
  seasonPublisherId?: string,
  seasonState?: SeasonState,
  seasonName?: string,
  seasonCoverImageR2Filename?: string,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimeMs?: number,
  seasonRecentPremiereTimeMs?: number,
  seasonRatingsCount?: number,
  seasonAverageRating?: number,
}

export let LIST_SEASONS_FOR_PUBLISHER_ROW: MessageDescriptor<ListSeasonsForPublisherRow> = {
  name: 'ListSeasonsForPublisherRow',
  fields: [{
    name: 'seasonSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'seasonName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingsCount',
    index: 9,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonAverageRating',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listSeasonsForPublisher(
  runner: Database | Transaction,
  args: {
    seasonPublisherIdEq?: string,
    seasonStateEq?: SeasonState,
    seasonLastChangeTimeMsLt?: number,
    limit: number,
  }
): Promise<Array<ListSeasonsForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.seasonId, Season.publisherId, Season.state, Season.name, Season.coverImageR2Filename, Season.totalEpisodes, Season.lastChangeTimeMs, Season.recentPremiereTimeMs, Season.ratingsCount, Season.averageRating FROM Season WHERE (Season.publisherId = @seasonPublisherIdEq AND Season.state = @seasonStateEq AND Season.lastChangeTimeMs < @seasonLastChangeTimeMsLt) ORDER BY Season.lastChangeTimeMs DESC LIMIT @limit",
    params: {
      seasonPublisherIdEq: args.seasonPublisherIdEq == null ? null : args.seasonPublisherIdEq,
      seasonStateEq: args.seasonStateEq == null ? null : Spanner.float(args.seasonStateEq),
      seasonLastChangeTimeMsLt: args.seasonLastChangeTimeMsLt == null ? null : Spanner.float(args.seasonLastChangeTimeMsLt),
      limit: args.limit.toString(),
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
      seasonSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      seasonName: row.at(3).value == null ? undefined : row.at(3).value,
      seasonCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      seasonTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      seasonLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      seasonRecentPremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      seasonRatingsCount: row.at(8).value == null ? undefined : row.at(8).value.value,
      seasonAverageRating: row.at(9).value == null ? undefined : row.at(9).value.value,
    });
  }
  return resRows;
}

export interface SearchSeasonsForPublisherRow {
  seasonSeasonId?: string,
  seasonPublisherId?: string,
  seasonState?: SeasonState,
  seasonName?: string,
  seasonCoverImageR2Filename?: string,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimeMs?: number,
  seasonRecentPremiereTimeMs?: number,
  seasonRatingsCount?: number,
  seasonAverageRating?: number,
  seasonFullTextScore?: number,
  seasonCreatedTimeMs?: number,
}

export let SEARCH_SEASONS_FOR_PUBLISHER_ROW: MessageDescriptor<SearchSeasonsForPublisherRow> = {
  name: 'SearchSeasonsForPublisherRow',
  fields: [{
    name: 'seasonSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'seasonName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingsCount',
    index: 9,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonAverageRating',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonFullTextScore',
    index: 11,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonCreatedTimeMs',
    index: 12,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function searchSeasonsForPublisher(
  runner: Database | Transaction,
  args: {
    seasonPublisherIdEq?: string,
    seasonFullTextSearch: string,
    seasonFullTextScoreOrderBy: string,
    limit: number,
    seasonFullTextScoreSelect: string,
  }
): Promise<Array<SearchSeasonsForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.seasonId, Season.publisherId, Season.state, Season.name, Season.coverImageR2Filename, Season.totalEpisodes, Season.lastChangeTimeMs, Season.recentPremiereTimeMs, Season.ratingsCount, Season.averageRating, SCORE(Season.fullText, @seasonFullTextScoreSelect), Season.createdTimeMs FROM Season WHERE (Season.publisherId = @seasonPublisherIdEq AND SEARCH(Season.fullText, @seasonFullTextSearch)) ORDER BY SCORE(Season.fullText, @seasonFullTextScoreOrderBy) DESC, Season.createdTimeMs LIMIT @limit",
    params: {
      seasonPublisherIdEq: args.seasonPublisherIdEq == null ? null : args.seasonPublisherIdEq,
      seasonFullTextSearch: args.seasonFullTextSearch,
      seasonFullTextScoreOrderBy: args.seasonFullTextScoreOrderBy,
      limit: args.limit.toString(),
      seasonFullTextScoreSelect: args.seasonFullTextScoreSelect,
    },
    types: {
      seasonPublisherIdEq: { type: "string" },
      seasonFullTextSearch: { type: "string" },
      seasonFullTextScoreOrderBy: { type: "string" },
      limit: { type: "int64" },
      seasonFullTextScoreSelect: { type: "string" },
    }
  });
  let resRows = new Array<SearchSeasonsForPublisherRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      seasonName: row.at(3).value == null ? undefined : row.at(3).value,
      seasonCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      seasonTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      seasonLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      seasonRecentPremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      seasonRatingsCount: row.at(8).value == null ? undefined : row.at(8).value.value,
      seasonAverageRating: row.at(9).value == null ? undefined : row.at(9).value.value,
      seasonFullTextScore: row.at(10).value == null ? undefined : row.at(10).value.value,
      seasonCreatedTimeMs: row.at(11).value == null ? undefined : row.at(11).value.valueOf(),
    });
  }
  return resRows;
}

export interface ContinuedSearchSeasonsForPublisherRow {
  seasonSeasonId?: string,
  seasonPublisherId?: string,
  seasonState?: SeasonState,
  seasonName?: string,
  seasonCoverImageR2Filename?: string,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimeMs?: number,
  seasonRecentPremiereTimeMs?: number,
  seasonRatingsCount?: number,
  seasonAverageRating?: number,
  seasonFullTextScore?: number,
  seasonCreatedTimeMs?: number,
}

export let CONTINUED_SEARCH_SEASONS_FOR_PUBLISHER_ROW: MessageDescriptor<ContinuedSearchSeasonsForPublisherRow> = {
  name: 'ContinuedSearchSeasonsForPublisherRow',
  fields: [{
    name: 'seasonSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'seasonName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingsCount',
    index: 9,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonAverageRating',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonFullTextScore',
    index: 11,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonCreatedTimeMs',
    index: 12,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function continuedSearchSeasonsForPublisher(
  runner: Database | Transaction,
  args: {
    seasonPublisherIdEq?: string,
    seasonFullTextSearch: string,
    seasonFullTextScoreWhereLt: string,
    seasonFullTextScoreLt: number,
    seasonFullTextScoreWhereEq: string,
    seasonFullTextScoreEq: number,
    seasonCreatedTimeMsGt: number,
    seasonFullTextScoreOrderBy: string,
    limit: number,
    seasonFullTextScoreSelect: string,
  }
): Promise<Array<ContinuedSearchSeasonsForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.seasonId, Season.publisherId, Season.state, Season.name, Season.coverImageR2Filename, Season.totalEpisodes, Season.lastChangeTimeMs, Season.recentPremiereTimeMs, Season.ratingsCount, Season.averageRating, SCORE(Season.fullText, @seasonFullTextScoreSelect), Season.createdTimeMs FROM Season WHERE (Season.publisherId = @seasonPublisherIdEq AND SEARCH(Season.fullText, @seasonFullTextSearch) AND (SCORE(Season.fullText, @seasonFullTextScoreWhereLt) < @seasonFullTextScoreLt OR (SCORE(Season.fullText, @seasonFullTextScoreWhereEq) = @seasonFullTextScoreEq AND Season.createdTimeMs > @seasonCreatedTimeMsGt))) ORDER BY SCORE(Season.fullText, @seasonFullTextScoreOrderBy) DESC, Season.createdTimeMs LIMIT @limit",
    params: {
      seasonPublisherIdEq: args.seasonPublisherIdEq == null ? null : args.seasonPublisherIdEq,
      seasonFullTextSearch: args.seasonFullTextSearch,
      seasonFullTextScoreWhereLt: args.seasonFullTextScoreWhereLt,
      seasonFullTextScoreLt: Spanner.float(args.seasonFullTextScoreLt),
      seasonFullTextScoreWhereEq: args.seasonFullTextScoreWhereEq,
      seasonFullTextScoreEq: Spanner.float(args.seasonFullTextScoreEq),
      seasonCreatedTimeMsGt: args.seasonCreatedTimeMsGt.toString(),
      seasonFullTextScoreOrderBy: args.seasonFullTextScoreOrderBy,
      limit: args.limit.toString(),
      seasonFullTextScoreSelect: args.seasonFullTextScoreSelect,
    },
    types: {
      seasonPublisherIdEq: { type: "string" },
      seasonFullTextSearch: { type: "string" },
      seasonFullTextScoreWhereLt: { type: "string" },
      seasonFullTextScoreLt: { type: "float64" },
      seasonFullTextScoreWhereEq: { type: "string" },
      seasonFullTextScoreEq: { type: "float64" },
      seasonCreatedTimeMsGt: { type: "int64" },
      seasonFullTextScoreOrderBy: { type: "string" },
      limit: { type: "int64" },
      seasonFullTextScoreSelect: { type: "string" },
    }
  });
  let resRows = new Array<ContinuedSearchSeasonsForPublisherRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      seasonName: row.at(3).value == null ? undefined : row.at(3).value,
      seasonCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      seasonTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      seasonLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      seasonRecentPremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      seasonRatingsCount: row.at(8).value == null ? undefined : row.at(8).value.value,
      seasonAverageRating: row.at(9).value == null ? undefined : row.at(9).value.value,
      seasonFullTextScore: row.at(10).value == null ? undefined : row.at(10).value.value,
      seasonCreatedTimeMs: row.at(11).value == null ? undefined : row.at(11).value.valueOf(),
    });
  }
  return resRows;
}

export interface ListPublishedSeasonsByPremiereTimeForConsumerRow {
  seasonSeasonId?: string,
  seasonPublisherId?: string,
  seasonState?: SeasonState,
  seasonName?: string,
  seasonCoverImageR2Filename?: string,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimeMs?: number,
  seasonRecentPremiereTimeMs?: number,
  seasonRatingsCount?: number,
  seasonAverageRating?: number,
  seasonCreatedTimeMs?: number,
}

export let LIST_PUBLISHED_SEASONS_BY_PREMIERE_TIME_FOR_CONSUMER_ROW: MessageDescriptor<ListPublishedSeasonsByPremiereTimeForConsumerRow> = {
  name: 'ListPublishedSeasonsByPremiereTimeForConsumerRow',
  fields: [{
    name: 'seasonSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'seasonName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingsCount',
    index: 9,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonAverageRating',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonCreatedTimeMs',
    index: 11,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listPublishedSeasonsByPremiereTimeForConsumer(
  runner: Database | Transaction,
  args: {
    seasonStateEq?: SeasonState,
    seasonRecentPremiereTimeMsLt?: number,
    seasonRecentPremiereTimeMsEq?: number,
    seasonCreatedTimeMsLt: number,
    limit: number,
  }
): Promise<Array<ListPublishedSeasonsByPremiereTimeForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.seasonId, Season.publisherId, Season.state, Season.name, Season.coverImageR2Filename, Season.totalEpisodes, Season.lastChangeTimeMs, Season.recentPremiereTimeMs, Season.ratingsCount, Season.averageRating, Season.createdTimeMs FROM Season WHERE (Season.state = @seasonStateEq AND (Season.recentPremiereTimeMs < @seasonRecentPremiereTimeMsLt OR (Season.recentPremiereTimeMs = @seasonRecentPremiereTimeMsEq AND Season.createdTimeMs < @seasonCreatedTimeMsLt))) ORDER BY Season.recentPremiereTimeMs DESC, Season.createdTimeMs DESC LIMIT @limit",
    params: {
      seasonStateEq: args.seasonStateEq == null ? null : Spanner.float(args.seasonStateEq),
      seasonRecentPremiereTimeMsLt: args.seasonRecentPremiereTimeMsLt == null ? null : Spanner.float(args.seasonRecentPremiereTimeMsLt),
      seasonRecentPremiereTimeMsEq: args.seasonRecentPremiereTimeMsEq == null ? null : Spanner.float(args.seasonRecentPremiereTimeMsEq),
      seasonCreatedTimeMsLt: args.seasonCreatedTimeMsLt.toString(),
      limit: args.limit.toString(),
    },
    types: {
      seasonStateEq: { type: "float64" },
      seasonRecentPremiereTimeMsLt: { type: "float64" },
      seasonRecentPremiereTimeMsEq: { type: "float64" },
      seasonCreatedTimeMsLt: { type: "int64" },
      limit: { type: "int64" },
    }
  });
  let resRows = new Array<ListPublishedSeasonsByPremiereTimeForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      seasonName: row.at(3).value == null ? undefined : row.at(3).value,
      seasonCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      seasonTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      seasonLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      seasonRecentPremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      seasonRatingsCount: row.at(8).value == null ? undefined : row.at(8).value.value,
      seasonAverageRating: row.at(9).value == null ? undefined : row.at(9).value.value,
      seasonCreatedTimeMs: row.at(10).value == null ? undefined : row.at(10).value.valueOf(),
    });
  }
  return resRows;
}

export interface ListPublishedSeasonsByRatingForConsumerRow {
  seasonSeasonId?: string,
  seasonPublisherId?: string,
  seasonState?: SeasonState,
  seasonName?: string,
  seasonCoverImageR2Filename?: string,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimeMs?: number,
  seasonRecentPremiereTimeMs?: number,
  seasonRatingsCount?: number,
  seasonAverageRating?: number,
  seasonCreatedTimeMs?: number,
}

export let LIST_PUBLISHED_SEASONS_BY_RATING_FOR_CONSUMER_ROW: MessageDescriptor<ListPublishedSeasonsByRatingForConsumerRow> = {
  name: 'ListPublishedSeasonsByRatingForConsumerRow',
  fields: [{
    name: 'seasonSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'seasonName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingsCount',
    index: 9,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonAverageRating',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonCreatedTimeMs',
    index: 11,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listPublishedSeasonsByRatingForConsumer(
  runner: Database | Transaction,
  args: {
    seasonStateEq?: SeasonState,
    seasonAverageRatingLt?: number,
    seasonAverageRatingEq?: number,
    seasonCreatedTimeMsLt: number,
    limit: number,
  }
): Promise<Array<ListPublishedSeasonsByRatingForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.seasonId, Season.publisherId, Season.state, Season.name, Season.coverImageR2Filename, Season.totalEpisodes, Season.lastChangeTimeMs, Season.recentPremiereTimeMs, Season.ratingsCount, Season.averageRating, Season.createdTimeMs FROM Season WHERE (Season.state = @seasonStateEq AND (Season.averageRating < @seasonAverageRatingLt OR (Season.averageRating = @seasonAverageRatingEq AND Season.createdTimeMs < @seasonCreatedTimeMsLt))) ORDER BY Season.averageRating DESC, Season.createdTimeMs DESC LIMIT @limit",
    params: {
      seasonStateEq: args.seasonStateEq == null ? null : Spanner.float(args.seasonStateEq),
      seasonAverageRatingLt: args.seasonAverageRatingLt == null ? null : Spanner.float(args.seasonAverageRatingLt),
      seasonAverageRatingEq: args.seasonAverageRatingEq == null ? null : Spanner.float(args.seasonAverageRatingEq),
      seasonCreatedTimeMsLt: args.seasonCreatedTimeMsLt.toString(),
      limit: args.limit.toString(),
    },
    types: {
      seasonStateEq: { type: "float64" },
      seasonAverageRatingLt: { type: "float64" },
      seasonAverageRatingEq: { type: "float64" },
      seasonCreatedTimeMsLt: { type: "int64" },
      limit: { type: "int64" },
    }
  });
  let resRows = new Array<ListPublishedSeasonsByRatingForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      seasonName: row.at(3).value == null ? undefined : row.at(3).value,
      seasonCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      seasonTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      seasonLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      seasonRecentPremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      seasonRatingsCount: row.at(8).value == null ? undefined : row.at(8).value.value,
      seasonAverageRating: row.at(9).value == null ? undefined : row.at(9).value.value,
      seasonCreatedTimeMs: row.at(10).value == null ? undefined : row.at(10).value.valueOf(),
    });
  }
  return resRows;
}

export interface ListPublishedSeasonsByPremiereTimeAndPublisherForConsumerRow {
  seasonSeasonId?: string,
  seasonPublisherId?: string,
  seasonState?: SeasonState,
  seasonName?: string,
  seasonCoverImageR2Filename?: string,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimeMs?: number,
  seasonRecentPremiereTimeMs?: number,
  seasonRatingsCount?: number,
  seasonAverageRating?: number,
  seasonCreatedTimeMs?: number,
}

export let LIST_PUBLISHED_SEASONS_BY_PREMIERE_TIME_AND_PUBLISHER_FOR_CONSUMER_ROW: MessageDescriptor<ListPublishedSeasonsByPremiereTimeAndPublisherForConsumerRow> = {
  name: 'ListPublishedSeasonsByPremiereTimeAndPublisherForConsumerRow',
  fields: [{
    name: 'seasonSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'seasonName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingsCount',
    index: 9,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonAverageRating',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonCreatedTimeMs',
    index: 11,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listPublishedSeasonsByPremiereTimeAndPublisherForConsumer(
  runner: Database | Transaction,
  args: {
    seasonStateEq?: SeasonState,
    seasonPublisherIdEq?: string,
    seasonRecentPremiereTimeMsLt?: number,
    seasonRecentPremiereTimeMsEq?: number,
    seasonCreatedTimeMsLt: number,
    limit: number,
  }
): Promise<Array<ListPublishedSeasonsByPremiereTimeAndPublisherForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.seasonId, Season.publisherId, Season.state, Season.name, Season.coverImageR2Filename, Season.totalEpisodes, Season.lastChangeTimeMs, Season.recentPremiereTimeMs, Season.ratingsCount, Season.averageRating, Season.createdTimeMs FROM Season WHERE (Season.state = @seasonStateEq AND Season.publisherId = @seasonPublisherIdEq AND (Season.recentPremiereTimeMs < @seasonRecentPremiereTimeMsLt OR (Season.recentPremiereTimeMs = @seasonRecentPremiereTimeMsEq AND Season.createdTimeMs < @seasonCreatedTimeMsLt))) ORDER BY Season.recentPremiereTimeMs DESC, Season.createdTimeMs DESC LIMIT @limit",
    params: {
      seasonStateEq: args.seasonStateEq == null ? null : Spanner.float(args.seasonStateEq),
      seasonPublisherIdEq: args.seasonPublisherIdEq == null ? null : args.seasonPublisherIdEq,
      seasonRecentPremiereTimeMsLt: args.seasonRecentPremiereTimeMsLt == null ? null : Spanner.float(args.seasonRecentPremiereTimeMsLt),
      seasonRecentPremiereTimeMsEq: args.seasonRecentPremiereTimeMsEq == null ? null : Spanner.float(args.seasonRecentPremiereTimeMsEq),
      seasonCreatedTimeMsLt: args.seasonCreatedTimeMsLt.toString(),
      limit: args.limit.toString(),
    },
    types: {
      seasonStateEq: { type: "float64" },
      seasonPublisherIdEq: { type: "string" },
      seasonRecentPremiereTimeMsLt: { type: "float64" },
      seasonRecentPremiereTimeMsEq: { type: "float64" },
      seasonCreatedTimeMsLt: { type: "int64" },
      limit: { type: "int64" },
    }
  });
  let resRows = new Array<ListPublishedSeasonsByPremiereTimeAndPublisherForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      seasonName: row.at(3).value == null ? undefined : row.at(3).value,
      seasonCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      seasonTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      seasonLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      seasonRecentPremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      seasonRatingsCount: row.at(8).value == null ? undefined : row.at(8).value.value,
      seasonAverageRating: row.at(9).value == null ? undefined : row.at(9).value.value,
      seasonCreatedTimeMs: row.at(10).value == null ? undefined : row.at(10).value.valueOf(),
    });
  }
  return resRows;
}

export interface ListPublishedSeasonsByRatingAndPublisherForConsumerRow {
  seasonSeasonId?: string,
  seasonPublisherId?: string,
  seasonState?: SeasonState,
  seasonName?: string,
  seasonCoverImageR2Filename?: string,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimeMs?: number,
  seasonRecentPremiereTimeMs?: number,
  seasonRatingsCount?: number,
  seasonAverageRating?: number,
  seasonCreatedTimeMs?: number,
}

export let LIST_PUBLISHED_SEASONS_BY_RATING_AND_PUBLISHER_FOR_CONSUMER_ROW: MessageDescriptor<ListPublishedSeasonsByRatingAndPublisherForConsumerRow> = {
  name: 'ListPublishedSeasonsByRatingAndPublisherForConsumerRow',
  fields: [{
    name: 'seasonSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'seasonName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingsCount',
    index: 9,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonAverageRating',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonCreatedTimeMs',
    index: 11,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listPublishedSeasonsByRatingAndPublisherForConsumer(
  runner: Database | Transaction,
  args: {
    seasonStateEq?: SeasonState,
    seasonPublisherIdEq?: string,
    seasonAverageRatingLt?: number,
    seasonAverageRatingEq?: number,
    seasonCreatedTimeMsLt: number,
    limit: number,
  }
): Promise<Array<ListPublishedSeasonsByRatingAndPublisherForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.seasonId, Season.publisherId, Season.state, Season.name, Season.coverImageR2Filename, Season.totalEpisodes, Season.lastChangeTimeMs, Season.recentPremiereTimeMs, Season.ratingsCount, Season.averageRating, Season.createdTimeMs FROM Season WHERE (Season.state = @seasonStateEq AND Season.publisherId = @seasonPublisherIdEq AND (Season.averageRating < @seasonAverageRatingLt OR (Season.averageRating = @seasonAverageRatingEq AND Season.createdTimeMs < @seasonCreatedTimeMsLt))) ORDER BY Season.averageRating DESC, Season.createdTimeMs DESC LIMIT @limit",
    params: {
      seasonStateEq: args.seasonStateEq == null ? null : Spanner.float(args.seasonStateEq),
      seasonPublisherIdEq: args.seasonPublisherIdEq == null ? null : args.seasonPublisherIdEq,
      seasonAverageRatingLt: args.seasonAverageRatingLt == null ? null : Spanner.float(args.seasonAverageRatingLt),
      seasonAverageRatingEq: args.seasonAverageRatingEq == null ? null : Spanner.float(args.seasonAverageRatingEq),
      seasonCreatedTimeMsLt: args.seasonCreatedTimeMsLt.toString(),
      limit: args.limit.toString(),
    },
    types: {
      seasonStateEq: { type: "float64" },
      seasonPublisherIdEq: { type: "string" },
      seasonAverageRatingLt: { type: "float64" },
      seasonAverageRatingEq: { type: "float64" },
      seasonCreatedTimeMsLt: { type: "int64" },
      limit: { type: "int64" },
    }
  });
  let resRows = new Array<ListPublishedSeasonsByRatingAndPublisherForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      seasonName: row.at(3).value == null ? undefined : row.at(3).value,
      seasonCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      seasonTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      seasonLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      seasonRecentPremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      seasonRatingsCount: row.at(8).value == null ? undefined : row.at(8).value.value,
      seasonAverageRating: row.at(9).value == null ? undefined : row.at(9).value.value,
      seasonCreatedTimeMs: row.at(10).value == null ? undefined : row.at(10).value.valueOf(),
    });
  }
  return resRows;
}

export interface GetPublishedSeasonForConsumerRow {
  seasonSeasonId?: string,
  seasonPublisherId?: string,
  seasonState?: SeasonState,
  seasonName?: string,
  seasonCoverImageR2Filename?: string,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimeMs?: number,
  seasonRecentPremiereTimeMs?: number,
  seasonRatingsCount?: number,
  seasonAverageRating?: number,
}

export let GET_PUBLISHED_SEASON_FOR_CONSUMER_ROW: MessageDescriptor<GetPublishedSeasonForConsumerRow> = {
  name: 'GetPublishedSeasonForConsumerRow',
  fields: [{
    name: 'seasonSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'seasonName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingsCount',
    index: 9,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonAverageRating',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getPublishedSeasonForConsumer(
  runner: Database | Transaction,
  args: {
    seasonSeasonIdEq: string,
    seasonStateEq?: SeasonState,
  }
): Promise<Array<GetPublishedSeasonForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.seasonId, Season.publisherId, Season.state, Season.name, Season.coverImageR2Filename, Season.totalEpisodes, Season.lastChangeTimeMs, Season.recentPremiereTimeMs, Season.ratingsCount, Season.averageRating FROM Season WHERE (Season.seasonId = @seasonSeasonIdEq AND Season.state = @seasonStateEq)",
    params: {
      seasonSeasonIdEq: args.seasonSeasonIdEq,
      seasonStateEq: args.seasonStateEq == null ? null : Spanner.float(args.seasonStateEq),
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
      seasonStateEq: { type: "float64" },
    }
  });
  let resRows = new Array<GetPublishedSeasonForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      seasonName: row.at(3).value == null ? undefined : row.at(3).value,
      seasonCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      seasonTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      seasonLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      seasonRecentPremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      seasonRatingsCount: row.at(8).value == null ? undefined : row.at(8).value.value,
      seasonAverageRating: row.at(9).value == null ? undefined : row.at(9).value.value,
    });
  }
  return resRows;
}

export interface GetPublishedSeasonAndEpisodeForConsumerRow {
  seasonSeasonId?: string,
  seasonPublisherId?: string,
  seasonState?: SeasonState,
  seasonName?: string,
  seasonCoverImageR2Filename?: string,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimeMs?: number,
  seasonRecentPremiereTimeMs?: number,
  seasonRatingsCount?: number,
  seasonAverageRating?: number,
  episodeSeasonId?: string,
  episodeEpisodeId?: string,
  episodeIndex?: number,
  episodeName?: string,
  episodeVideoContainerId?: string,
  episodeVideoContainer?: VideoContainer,
  episodeState?: EpisodeState,
  episodePremiereTimeMs?: number,
}

export let GET_PUBLISHED_SEASON_AND_EPISODE_FOR_CONSUMER_ROW: MessageDescriptor<GetPublishedSeasonAndEpisodeForConsumerRow> = {
  name: 'GetPublishedSeasonAndEpisodeForConsumerRow',
  fields: [{
    name: 'seasonSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'seasonName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingsCount',
    index: 9,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonAverageRating',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'episodeSeasonId',
    index: 11,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeEpisodeId',
    index: 12,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeIndex',
    index: 13,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'episodeName',
    index: 14,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainerId',
    index: 15,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainer',
    index: 16,
    messageType: VIDEO_CONTAINER,
  }, {
    name: 'episodeState',
    index: 17,
    enumType: EPISODE_STATE,
  }, {
    name: 'episodePremiereTimeMs',
    index: 18,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getPublishedSeasonAndEpisodeForConsumer(
  runner: Database | Transaction,
  args: {
    seasonSeasonIdEq: string,
    seasonStateEq?: SeasonState,
    episodeEpisodeIdEq: string,
    episodeStateEq?: EpisodeState,
  }
): Promise<Array<GetPublishedSeasonAndEpisodeForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT s.seasonId, s.publisherId, s.state, s.name, s.coverImageR2Filename, s.totalEpisodes, s.lastChangeTimeMs, s.recentPremiereTimeMs, s.ratingsCount, s.averageRating, e.seasonId, e.episodeId, e.index, e.name, e.videoContainerId, e.videoContainer, e.state, e.premiereTimeMs FROM Season AS s INNER JOIN Episode AS e ON s.seasonId = e.seasonId WHERE (s.seasonId = @seasonSeasonIdEq AND s.state = @seasonStateEq AND e.episodeId = @episodeEpisodeIdEq AND e.state = @episodeStateEq)",
    params: {
      seasonSeasonIdEq: args.seasonSeasonIdEq,
      seasonStateEq: args.seasonStateEq == null ? null : Spanner.float(args.seasonStateEq),
      episodeEpisodeIdEq: args.episodeEpisodeIdEq,
      episodeStateEq: args.episodeStateEq == null ? null : Spanner.float(args.episodeStateEq),
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
      seasonStateEq: { type: "float64" },
      episodeEpisodeIdEq: { type: "string" },
      episodeStateEq: { type: "float64" },
    }
  });
  let resRows = new Array<GetPublishedSeasonAndEpisodeForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      seasonName: row.at(3).value == null ? undefined : row.at(3).value,
      seasonCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      seasonTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      seasonLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      seasonRecentPremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      seasonRatingsCount: row.at(8).value == null ? undefined : row.at(8).value.value,
      seasonAverageRating: row.at(9).value == null ? undefined : row.at(9).value.value,
      episodeSeasonId: row.at(10).value == null ? undefined : row.at(10).value,
      episodeEpisodeId: row.at(11).value == null ? undefined : row.at(11).value,
      episodeIndex: row.at(12).value == null ? undefined : row.at(12).value.value,
      episodeName: row.at(13).value == null ? undefined : row.at(13).value,
      episodeVideoContainerId: row.at(14).value == null ? undefined : row.at(14).value,
      episodeVideoContainer: row.at(15).value == null ? undefined : deserializeMessage(row.at(15).value, VIDEO_CONTAINER),
      episodeState: row.at(16).value == null ? undefined : toEnumFromNumber(row.at(16).value.value, EPISODE_STATE),
      episodePremiereTimeMs: row.at(17).value == null ? undefined : row.at(17).value.value,
    });
  }
  return resRows;
}

export interface GetPublishedSeasonAllForConsumerRow {
  seasonSeasonId?: string,
  seasonPublisherId?: string,
  seasonState?: SeasonState,
  seasonName?: string,
  seasonCoverImageR2Filename?: string,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimeMs?: number,
  seasonRecentPremiereTimeMs?: number,
  seasonDescription?: string,
  seasonCreatedTimeMs?: number,
  seasonTotalRatings?: number,
  seasonRatingsCount?: number,
  seasonAverageRating?: number,
  seasonRatingUpdatedTimeMs?: number,
}

export let GET_PUBLISHED_SEASON_ALL_FOR_CONSUMER_ROW: MessageDescriptor<GetPublishedSeasonAllForConsumerRow> = {
  name: 'GetPublishedSeasonAllForConsumerRow',
  fields: [{
    name: 'seasonSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'seasonName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonDescription',
    index: 9,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCreatedTimeMs',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonTotalRatings',
    index: 11,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingsCount',
    index: 12,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonAverageRating',
    index: 13,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingUpdatedTimeMs',
    index: 14,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getPublishedSeasonAllForConsumer(
  runner: Database | Transaction,
  args: {
    seasonSeasonIdEq: string,
    seasonStateEq?: SeasonState,
  }
): Promise<Array<GetPublishedSeasonAllForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.seasonId, Season.publisherId, Season.state, Season.name, Season.coverImageR2Filename, Season.totalEpisodes, Season.lastChangeTimeMs, Season.recentPremiereTimeMs, Season.description, Season.createdTimeMs, Season.totalRatings, Season.ratingsCount, Season.averageRating, Season.ratingUpdatedTimeMs FROM Season WHERE (Season.seasonId = @seasonSeasonIdEq AND Season.state = @seasonStateEq)",
    params: {
      seasonSeasonIdEq: args.seasonSeasonIdEq,
      seasonStateEq: args.seasonStateEq == null ? null : Spanner.float(args.seasonStateEq),
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
      seasonStateEq: { type: "float64" },
    }
  });
  let resRows = new Array<GetPublishedSeasonAllForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      seasonName: row.at(3).value == null ? undefined : row.at(3).value,
      seasonCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      seasonTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      seasonLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      seasonRecentPremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      seasonDescription: row.at(8).value == null ? undefined : row.at(8).value,
      seasonCreatedTimeMs: row.at(9).value == null ? undefined : row.at(9).value.valueOf(),
      seasonTotalRatings: row.at(10).value == null ? undefined : row.at(10).value.value,
      seasonRatingsCount: row.at(11).value == null ? undefined : row.at(11).value.value,
      seasonAverageRating: row.at(12).value == null ? undefined : row.at(12).value.value,
      seasonRatingUpdatedTimeMs: row.at(13).value == null ? undefined : row.at(13).value.value,
    });
  }
  return resRows;
}

export interface GetPublishedSeasonRatingForConsumerRow {
  seasonTotalRatings?: number,
  seasonRatingsCount?: number,
  seasonAverageRating?: number,
  seasonRatingUpdatedTimeMs?: number,
}

export let GET_PUBLISHED_SEASON_RATING_FOR_CONSUMER_ROW: MessageDescriptor<GetPublishedSeasonRatingForConsumerRow> = {
  name: 'GetPublishedSeasonRatingForConsumerRow',
  fields: [{
    name: 'seasonTotalRatings',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingsCount',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonAverageRating',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingUpdatedTimeMs',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getPublishedSeasonRatingForConsumer(
  runner: Database | Transaction,
  args: {
    seasonSeasonIdEq: string,
    seasonStateEq?: SeasonState,
  }
): Promise<Array<GetPublishedSeasonRatingForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.totalRatings, Season.ratingsCount, Season.averageRating, Season.ratingUpdatedTimeMs FROM Season WHERE (Season.seasonId = @seasonSeasonIdEq AND Season.state = @seasonStateEq)",
    params: {
      seasonSeasonIdEq: args.seasonSeasonIdEq,
      seasonStateEq: args.seasonStateEq == null ? null : Spanner.float(args.seasonStateEq),
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
      seasonStateEq: { type: "float64" },
    }
  });
  let resRows = new Array<GetPublishedSeasonRatingForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      seasonTotalRatings: row.at(0).value == null ? undefined : row.at(0).value.value,
      seasonRatingsCount: row.at(1).value == null ? undefined : row.at(1).value.value,
      seasonAverageRating: row.at(2).value == null ? undefined : row.at(2).value.value,
      seasonRatingUpdatedTimeMs: row.at(3).value == null ? undefined : row.at(3).value.value,
    });
  }
  return resRows;
}

export interface SearchPublishedSeasonsForConsumerRow {
  seasonSeasonId?: string,
  seasonPublisherId?: string,
  seasonState?: SeasonState,
  seasonName?: string,
  seasonCoverImageR2Filename?: string,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimeMs?: number,
  seasonRecentPremiereTimeMs?: number,
  seasonRatingsCount?: number,
  seasonAverageRating?: number,
  seasonFullTextScore?: number,
  seasonCreatedTimeMs?: number,
}

export let SEARCH_PUBLISHED_SEASONS_FOR_CONSUMER_ROW: MessageDescriptor<SearchPublishedSeasonsForConsumerRow> = {
  name: 'SearchPublishedSeasonsForConsumerRow',
  fields: [{
    name: 'seasonSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'seasonName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingsCount',
    index: 9,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonAverageRating',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonFullTextScore',
    index: 11,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonCreatedTimeMs',
    index: 12,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function searchPublishedSeasonsForConsumer(
  runner: Database | Transaction,
  args: {
    seasonStateEq?: SeasonState,
    seasonFullTextSearch: string,
    seasonFullTextScoreOrderBy: string,
    limit: number,
    seasonFullTextScoreSelect: string,
  }
): Promise<Array<SearchPublishedSeasonsForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.seasonId, Season.publisherId, Season.state, Season.name, Season.coverImageR2Filename, Season.totalEpisodes, Season.lastChangeTimeMs, Season.recentPremiereTimeMs, Season.ratingsCount, Season.averageRating, SCORE(Season.fullText, @seasonFullTextScoreSelect), Season.createdTimeMs FROM Season WHERE (Season.state = @seasonStateEq AND SEARCH(Season.fullText, @seasonFullTextSearch)) ORDER BY SCORE(Season.fullText, @seasonFullTextScoreOrderBy) DESC, Season.createdTimeMs LIMIT @limit",
    params: {
      seasonStateEq: args.seasonStateEq == null ? null : Spanner.float(args.seasonStateEq),
      seasonFullTextSearch: args.seasonFullTextSearch,
      seasonFullTextScoreOrderBy: args.seasonFullTextScoreOrderBy,
      limit: args.limit.toString(),
      seasonFullTextScoreSelect: args.seasonFullTextScoreSelect,
    },
    types: {
      seasonStateEq: { type: "float64" },
      seasonFullTextSearch: { type: "string" },
      seasonFullTextScoreOrderBy: { type: "string" },
      limit: { type: "int64" },
      seasonFullTextScoreSelect: { type: "string" },
    }
  });
  let resRows = new Array<SearchPublishedSeasonsForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      seasonName: row.at(3).value == null ? undefined : row.at(3).value,
      seasonCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      seasonTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      seasonLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      seasonRecentPremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      seasonRatingsCount: row.at(8).value == null ? undefined : row.at(8).value.value,
      seasonAverageRating: row.at(9).value == null ? undefined : row.at(9).value.value,
      seasonFullTextScore: row.at(10).value == null ? undefined : row.at(10).value.value,
      seasonCreatedTimeMs: row.at(11).value == null ? undefined : row.at(11).value.valueOf(),
    });
  }
  return resRows;
}

export interface ContinuedSearchPublishedSeasonsForConsumerRow {
  seasonSeasonId?: string,
  seasonPublisherId?: string,
  seasonState?: SeasonState,
  seasonName?: string,
  seasonCoverImageR2Filename?: string,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimeMs?: number,
  seasonRecentPremiereTimeMs?: number,
  seasonRatingsCount?: number,
  seasonAverageRating?: number,
  seasonFullTextScore?: number,
  seasonCreatedTimeMs?: number,
}

export let CONTINUED_SEARCH_PUBLISHED_SEASONS_FOR_CONSUMER_ROW: MessageDescriptor<ContinuedSearchPublishedSeasonsForConsumerRow> = {
  name: 'ContinuedSearchPublishedSeasonsForConsumerRow',
  fields: [{
    name: 'seasonSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'seasonName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingsCount',
    index: 9,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonAverageRating',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonFullTextScore',
    index: 11,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonCreatedTimeMs',
    index: 12,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function continuedSearchPublishedSeasonsForConsumer(
  runner: Database | Transaction,
  args: {
    seasonStateEq?: SeasonState,
    seasonFullTextSearch: string,
    seasonFullTextScoreWhereLt: string,
    seasonFullTextScoreLt: number,
    seasonFullTextScoreWhereEq: string,
    seasonFullTextScoreEq: number,
    seasonCreatedTimeMsGt: number,
    seasonFullTextScoreOrderBy: string,
    limit: number,
    seasonFullTextScoreSelect: string,
  }
): Promise<Array<ContinuedSearchPublishedSeasonsForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.seasonId, Season.publisherId, Season.state, Season.name, Season.coverImageR2Filename, Season.totalEpisodes, Season.lastChangeTimeMs, Season.recentPremiereTimeMs, Season.ratingsCount, Season.averageRating, SCORE(Season.fullText, @seasonFullTextScoreSelect), Season.createdTimeMs FROM Season WHERE (Season.state = @seasonStateEq AND SEARCH(Season.fullText, @seasonFullTextSearch) AND (SCORE(Season.fullText, @seasonFullTextScoreWhereLt) < @seasonFullTextScoreLt OR (SCORE(Season.fullText, @seasonFullTextScoreWhereEq) = @seasonFullTextScoreEq AND Season.createdTimeMs > @seasonCreatedTimeMsGt))) ORDER BY SCORE(Season.fullText, @seasonFullTextScoreOrderBy) DESC, Season.createdTimeMs LIMIT @limit",
    params: {
      seasonStateEq: args.seasonStateEq == null ? null : Spanner.float(args.seasonStateEq),
      seasonFullTextSearch: args.seasonFullTextSearch,
      seasonFullTextScoreWhereLt: args.seasonFullTextScoreWhereLt,
      seasonFullTextScoreLt: Spanner.float(args.seasonFullTextScoreLt),
      seasonFullTextScoreWhereEq: args.seasonFullTextScoreWhereEq,
      seasonFullTextScoreEq: Spanner.float(args.seasonFullTextScoreEq),
      seasonCreatedTimeMsGt: args.seasonCreatedTimeMsGt.toString(),
      seasonFullTextScoreOrderBy: args.seasonFullTextScoreOrderBy,
      limit: args.limit.toString(),
      seasonFullTextScoreSelect: args.seasonFullTextScoreSelect,
    },
    types: {
      seasonStateEq: { type: "float64" },
      seasonFullTextSearch: { type: "string" },
      seasonFullTextScoreWhereLt: { type: "string" },
      seasonFullTextScoreLt: { type: "float64" },
      seasonFullTextScoreWhereEq: { type: "string" },
      seasonFullTextScoreEq: { type: "float64" },
      seasonCreatedTimeMsGt: { type: "int64" },
      seasonFullTextScoreOrderBy: { type: "string" },
      limit: { type: "int64" },
      seasonFullTextScoreSelect: { type: "string" },
    }
  });
  let resRows = new Array<ContinuedSearchPublishedSeasonsForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      seasonName: row.at(3).value == null ? undefined : row.at(3).value,
      seasonCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      seasonTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      seasonLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      seasonRecentPremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      seasonRatingsCount: row.at(8).value == null ? undefined : row.at(8).value.value,
      seasonAverageRating: row.at(9).value == null ? undefined : row.at(9).value.value,
      seasonFullTextScore: row.at(10).value == null ? undefined : row.at(10).value.value,
      seasonCreatedTimeMs: row.at(11).value == null ? undefined : row.at(11).value.valueOf(),
    });
  }
  return resRows;
}

export interface GetSeasonGradeRow {
  seasonGradeSeasonId?: string,
  seasonGradeGradeId?: string,
  seasonGradeStartDate?: string,
  seasonGradeEndDate?: string,
  seasonGradeGrade?: number,
}

export let GET_SEASON_GRADE_ROW: MessageDescriptor<GetSeasonGradeRow> = {
  name: 'GetSeasonGradeRow',
  fields: [{
    name: 'seasonGradeSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonGradeGradeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonGradeStartDate',
    index: 3,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonGradeEndDate',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonGradeGrade',
    index: 5,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getSeasonGrade(
  runner: Database | Transaction,
  args: {
    seasonGradeSeasonIdEq: string,
    seasonGradeStartDateLe?: string,
    seasonGradeEndDateGt?: string,
  }
): Promise<Array<GetSeasonGradeRow>> {
  let [rows] = await runner.run({
    sql: "SELECT SeasonGrade.seasonId, SeasonGrade.gradeId, SeasonGrade.startDate, SeasonGrade.endDate, SeasonGrade.grade FROM SeasonGrade WHERE (SeasonGrade.seasonId = @seasonGradeSeasonIdEq AND SeasonGrade.startDate <= @seasonGradeStartDateLe AND SeasonGrade.endDate > @seasonGradeEndDateGt)",
    params: {
      seasonGradeSeasonIdEq: args.seasonGradeSeasonIdEq,
      seasonGradeStartDateLe: args.seasonGradeStartDateLe == null ? null : args.seasonGradeStartDateLe,
      seasonGradeEndDateGt: args.seasonGradeEndDateGt == null ? null : args.seasonGradeEndDateGt,
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
      seasonGradeSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonGradeGradeId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonGradeStartDate: row.at(2).value == null ? undefined : row.at(2).value,
      seasonGradeEndDate: row.at(3).value == null ? undefined : row.at(3).value,
      seasonGradeGrade: row.at(4).value == null ? undefined : row.at(4).value.value,
    });
  }
  return resRows;
}

export interface GetLastSeasonGradesRow {
  seasonGradeSeasonId?: string,
  seasonGradeGradeId?: string,
  seasonGradeStartDate?: string,
  seasonGradeEndDate?: string,
  seasonGradeGrade?: number,
}

export let GET_LAST_SEASON_GRADES_ROW: MessageDescriptor<GetLastSeasonGradesRow> = {
  name: 'GetLastSeasonGradesRow',
  fields: [{
    name: 'seasonGradeSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonGradeGradeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonGradeStartDate',
    index: 3,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonGradeEndDate',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonGradeGrade',
    index: 5,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getLastSeasonGrades(
  runner: Database | Transaction,
  args: {
    seasonGradeSeasonIdEq: string,
    seasonGradeEndDateGt?: string,
    limit: number,
  }
): Promise<Array<GetLastSeasonGradesRow>> {
  let [rows] = await runner.run({
    sql: "SELECT SeasonGrade.seasonId, SeasonGrade.gradeId, SeasonGrade.startDate, SeasonGrade.endDate, SeasonGrade.grade FROM SeasonGrade WHERE (SeasonGrade.seasonId = @seasonGradeSeasonIdEq AND SeasonGrade.endDate > @seasonGradeEndDateGt) ORDER BY SeasonGrade.endDate DESC LIMIT @limit",
    params: {
      seasonGradeSeasonIdEq: args.seasonGradeSeasonIdEq,
      seasonGradeEndDateGt: args.seasonGradeEndDateGt == null ? null : args.seasonGradeEndDateGt,
      limit: args.limit.toString(),
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
      seasonGradeSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonGradeGradeId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonGradeStartDate: row.at(2).value == null ? undefined : row.at(2).value,
      seasonGradeEndDate: row.at(3).value == null ? undefined : row.at(3).value,
      seasonGradeGrade: row.at(4).value == null ? undefined : row.at(4).value.value,
    });
  }
  return resRows;
}

export interface CheckPresenceOfEpisodeRow {
  episodeState?: EpisodeState,
}

export let CHECK_PRESENCE_OF_EPISODE_ROW: MessageDescriptor<CheckPresenceOfEpisodeRow> = {
  name: 'CheckPresenceOfEpisodeRow',
  fields: [{
    name: 'episodeState',
    index: 1,
    enumType: EPISODE_STATE,
  }],
};

export async function checkPresenceOfEpisode(
  runner: Database | Transaction,
  args: {
    episodeSeasonIdEq: string,
    episodeEpisodeIdEq: string,
  }
): Promise<Array<CheckPresenceOfEpisodeRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Episode.state FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
    params: {
      episodeSeasonIdEq: args.episodeSeasonIdEq,
      episodeEpisodeIdEq: args.episodeEpisodeIdEq,
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<CheckPresenceOfEpisodeRow>();
  for (let row of rows) {
    resRows.push({
      episodeState: row.at(0).value == null ? undefined : toEnumFromNumber(row.at(0).value.value, EPISODE_STATE),
    });
  }
  return resRows;
}

export interface GetPublishedEpisodeForConsumerRow {
  episodeSeasonId?: string,
  episodeEpisodeId?: string,
  episodeIndex?: number,
  episodeName?: string,
  episodeVideoContainerId?: string,
  episodeVideoContainer?: VideoContainer,
  episodeState?: EpisodeState,
  episodePremiereTimeMs?: number,
}

export let GET_PUBLISHED_EPISODE_FOR_CONSUMER_ROW: MessageDescriptor<GetPublishedEpisodeForConsumerRow> = {
  name: 'GetPublishedEpisodeForConsumerRow',
  fields: [{
    name: 'episodeSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeEpisodeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeIndex',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'episodeName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainerId',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainer',
    index: 6,
    messageType: VIDEO_CONTAINER,
  }, {
    name: 'episodeState',
    index: 7,
    enumType: EPISODE_STATE,
  }, {
    name: 'episodePremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getPublishedEpisodeForConsumer(
  runner: Database | Transaction,
  args: {
    episodeSeasonIdEq: string,
    seasonStateEq?: SeasonState,
    episodeEpisodeIdEq: string,
    episodeStateEq?: EpisodeState,
  }
): Promise<Array<GetPublishedEpisodeForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.seasonId, e.episodeId, e.index, e.name, e.videoContainerId, e.videoContainer, e.state, e.premiereTimeMs FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (e.seasonId = @episodeSeasonIdEq AND s.state = @seasonStateEq AND e.episodeId = @episodeEpisodeIdEq AND e.state = @episodeStateEq)",
    params: {
      episodeSeasonIdEq: args.episodeSeasonIdEq,
      seasonStateEq: args.seasonStateEq == null ? null : Spanner.float(args.seasonStateEq),
      episodeEpisodeIdEq: args.episodeEpisodeIdEq,
      episodeStateEq: args.episodeStateEq == null ? null : Spanner.float(args.episodeStateEq),
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      seasonStateEq: { type: "float64" },
      episodeEpisodeIdEq: { type: "string" },
      episodeStateEq: { type: "float64" },
    }
  });
  let resRows = new Array<GetPublishedEpisodeForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      episodeSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      episodeEpisodeId: row.at(1).value == null ? undefined : row.at(1).value,
      episodeIndex: row.at(2).value == null ? undefined : row.at(2).value.value,
      episodeName: row.at(3).value == null ? undefined : row.at(3).value,
      episodeVideoContainerId: row.at(4).value == null ? undefined : row.at(4).value,
      episodeVideoContainer: row.at(5).value == null ? undefined : deserializeMessage(row.at(5).value, VIDEO_CONTAINER),
      episodeState: row.at(6).value == null ? undefined : toEnumFromNumber(row.at(6).value.value, EPISODE_STATE),
      episodePremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
    });
  }
  return resRows;
}

export interface ListNextPublishedEpisodesForConsumerRow {
  episodeSeasonId?: string,
  episodeEpisodeId?: string,
  episodeIndex?: number,
  episodeName?: string,
  episodeVideoContainerId?: string,
  episodeVideoContainer?: VideoContainer,
  episodeState?: EpisodeState,
  episodePremiereTimeMs?: number,
}

export let LIST_NEXT_PUBLISHED_EPISODES_FOR_CONSUMER_ROW: MessageDescriptor<ListNextPublishedEpisodesForConsumerRow> = {
  name: 'ListNextPublishedEpisodesForConsumerRow',
  fields: [{
    name: 'episodeSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeEpisodeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeIndex',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'episodeName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainerId',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainer',
    index: 6,
    messageType: VIDEO_CONTAINER,
  }, {
    name: 'episodeState',
    index: 7,
    enumType: EPISODE_STATE,
  }, {
    name: 'episodePremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listNextPublishedEpisodesForConsumer(
  runner: Database | Transaction,
  args: {
    episodeSeasonIdEq: string,
    seasonStateEq?: SeasonState,
    episodeIndexGt?: number,
    episodeStateEq?: EpisodeState,
    limit: number,
  }
): Promise<Array<ListNextPublishedEpisodesForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.seasonId, e.episodeId, e.index, e.name, e.videoContainerId, e.videoContainer, e.state, e.premiereTimeMs FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (e.seasonId = @episodeSeasonIdEq AND s.state = @seasonStateEq AND e.index > @episodeIndexGt AND e.state = @episodeStateEq) ORDER BY e.index LIMIT @limit",
    params: {
      episodeSeasonIdEq: args.episodeSeasonIdEq,
      seasonStateEq: args.seasonStateEq == null ? null : Spanner.float(args.seasonStateEq),
      episodeIndexGt: args.episodeIndexGt == null ? null : Spanner.float(args.episodeIndexGt),
      episodeStateEq: args.episodeStateEq == null ? null : Spanner.float(args.episodeStateEq),
      limit: args.limit.toString(),
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      seasonStateEq: { type: "float64" },
      episodeIndexGt: { type: "float64" },
      episodeStateEq: { type: "float64" },
      limit: { type: "int64" },
    }
  });
  let resRows = new Array<ListNextPublishedEpisodesForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      episodeSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      episodeEpisodeId: row.at(1).value == null ? undefined : row.at(1).value,
      episodeIndex: row.at(2).value == null ? undefined : row.at(2).value.value,
      episodeName: row.at(3).value == null ? undefined : row.at(3).value,
      episodeVideoContainerId: row.at(4).value == null ? undefined : row.at(4).value,
      episodeVideoContainer: row.at(5).value == null ? undefined : deserializeMessage(row.at(5).value, VIDEO_CONTAINER),
      episodeState: row.at(6).value == null ? undefined : toEnumFromNumber(row.at(6).value.value, EPISODE_STATE),
      episodePremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
    });
  }
  return resRows;
}

export interface ListPrevPublishedEpisodesForConsumerRow {
  episodeSeasonId?: string,
  episodeEpisodeId?: string,
  episodeIndex?: number,
  episodeName?: string,
  episodeVideoContainerId?: string,
  episodeVideoContainer?: VideoContainer,
  episodeState?: EpisodeState,
  episodePremiereTimeMs?: number,
}

export let LIST_PREV_PUBLISHED_EPISODES_FOR_CONSUMER_ROW: MessageDescriptor<ListPrevPublishedEpisodesForConsumerRow> = {
  name: 'ListPrevPublishedEpisodesForConsumerRow',
  fields: [{
    name: 'episodeSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeEpisodeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeIndex',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'episodeName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainerId',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainer',
    index: 6,
    messageType: VIDEO_CONTAINER,
  }, {
    name: 'episodeState',
    index: 7,
    enumType: EPISODE_STATE,
  }, {
    name: 'episodePremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listPrevPublishedEpisodesForConsumer(
  runner: Database | Transaction,
  args: {
    episodeSeasonIdEq: string,
    seasonStateEq?: SeasonState,
    episodeIndexLt?: number,
    episodeStateEq?: EpisodeState,
    limit: number,
  }
): Promise<Array<ListPrevPublishedEpisodesForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.seasonId, e.episodeId, e.index, e.name, e.videoContainerId, e.videoContainer, e.state, e.premiereTimeMs FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (e.seasonId = @episodeSeasonIdEq AND s.state = @seasonStateEq AND e.index < @episodeIndexLt AND e.state = @episodeStateEq) ORDER BY e.index DESC LIMIT @limit",
    params: {
      episodeSeasonIdEq: args.episodeSeasonIdEq,
      seasonStateEq: args.seasonStateEq == null ? null : Spanner.float(args.seasonStateEq),
      episodeIndexLt: args.episodeIndexLt == null ? null : Spanner.float(args.episodeIndexLt),
      episodeStateEq: args.episodeStateEq == null ? null : Spanner.float(args.episodeStateEq),
      limit: args.limit.toString(),
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      seasonStateEq: { type: "float64" },
      episodeIndexLt: { type: "float64" },
      episodeStateEq: { type: "float64" },
      limit: { type: "int64" },
    }
  });
  let resRows = new Array<ListPrevPublishedEpisodesForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      episodeSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      episodeEpisodeId: row.at(1).value == null ? undefined : row.at(1).value,
      episodeIndex: row.at(2).value == null ? undefined : row.at(2).value.value,
      episodeName: row.at(3).value == null ? undefined : row.at(3).value,
      episodeVideoContainerId: row.at(4).value == null ? undefined : row.at(4).value,
      episodeVideoContainer: row.at(5).value == null ? undefined : deserializeMessage(row.at(5).value, VIDEO_CONTAINER),
      episodeState: row.at(6).value == null ? undefined : toEnumFromNumber(row.at(6).value.value, EPISODE_STATE),
      episodePremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
    });
  }
  return resRows;
}

export interface ListPrevEpisodesForPublisherRow {
  episodeSeasonId?: string,
  episodeEpisodeId?: string,
  episodeIndex?: number,
  episodeName?: string,
  episodeVideoContainerId?: string,
  episodeVideoContainer?: VideoContainer,
  episodeState?: EpisodeState,
  episodePremiereTimeMs?: number,
}

export let LIST_PREV_EPISODES_FOR_PUBLISHER_ROW: MessageDescriptor<ListPrevEpisodesForPublisherRow> = {
  name: 'ListPrevEpisodesForPublisherRow',
  fields: [{
    name: 'episodeSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeEpisodeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeIndex',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'episodeName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainerId',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainer',
    index: 6,
    messageType: VIDEO_CONTAINER,
  }, {
    name: 'episodeState',
    index: 7,
    enumType: EPISODE_STATE,
  }, {
    name: 'episodePremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listPrevEpisodesForPublisher(
  runner: Database | Transaction,
  args: {
    seasonPublisherIdEq?: string,
    episodeSeasonIdEq: string,
    episodeIndexLt?: number,
    limit: number,
  }
): Promise<Array<ListPrevEpisodesForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.seasonId, e.episodeId, e.index, e.name, e.videoContainerId, e.videoContainer, e.state, e.premiereTimeMs FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (s.publisherId = @seasonPublisherIdEq AND e.seasonId = @episodeSeasonIdEq AND e.index < @episodeIndexLt) ORDER BY e.index DESC LIMIT @limit",
    params: {
      seasonPublisherIdEq: args.seasonPublisherIdEq == null ? null : args.seasonPublisherIdEq,
      episodeSeasonIdEq: args.episodeSeasonIdEq,
      episodeIndexLt: args.episodeIndexLt == null ? null : Spanner.float(args.episodeIndexLt),
      limit: args.limit.toString(),
    },
    types: {
      seasonPublisherIdEq: { type: "string" },
      episodeSeasonIdEq: { type: "string" },
      episodeIndexLt: { type: "float64" },
      limit: { type: "int64" },
    }
  });
  let resRows = new Array<ListPrevEpisodesForPublisherRow>();
  for (let row of rows) {
    resRows.push({
      episodeSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      episodeEpisodeId: row.at(1).value == null ? undefined : row.at(1).value,
      episodeIndex: row.at(2).value == null ? undefined : row.at(2).value.value,
      episodeName: row.at(3).value == null ? undefined : row.at(3).value,
      episodeVideoContainerId: row.at(4).value == null ? undefined : row.at(4).value,
      episodeVideoContainer: row.at(5).value == null ? undefined : deserializeMessage(row.at(5).value, VIDEO_CONTAINER),
      episodeState: row.at(6).value == null ? undefined : toEnumFromNumber(row.at(6).value.value, EPISODE_STATE),
      episodePremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
    });
  }
  return resRows;
}

export interface ListNextEpisodesForPublisherRow {
  episodeSeasonId?: string,
  episodeEpisodeId?: string,
  episodeIndex?: number,
  episodeName?: string,
  episodeVideoContainerId?: string,
  episodeVideoContainer?: VideoContainer,
  episodeState?: EpisodeState,
  episodePremiereTimeMs?: number,
}

export let LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW: MessageDescriptor<ListNextEpisodesForPublisherRow> = {
  name: 'ListNextEpisodesForPublisherRow',
  fields: [{
    name: 'episodeSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeEpisodeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeIndex',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'episodeName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainerId',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainer',
    index: 6,
    messageType: VIDEO_CONTAINER,
  }, {
    name: 'episodeState',
    index: 7,
    enumType: EPISODE_STATE,
  }, {
    name: 'episodePremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listNextEpisodesForPublisher(
  runner: Database | Transaction,
  args: {
    seasonPublisherIdEq?: string,
    episodeSeasonIdEq: string,
    episodeIndexGt?: number,
    limit: number,
  }
): Promise<Array<ListNextEpisodesForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.seasonId, e.episodeId, e.index, e.name, e.videoContainerId, e.videoContainer, e.state, e.premiereTimeMs FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (s.publisherId = @seasonPublisherIdEq AND e.seasonId = @episodeSeasonIdEq AND e.index > @episodeIndexGt) ORDER BY e.index LIMIT @limit",
    params: {
      seasonPublisherIdEq: args.seasonPublisherIdEq == null ? null : args.seasonPublisherIdEq,
      episodeSeasonIdEq: args.episodeSeasonIdEq,
      episodeIndexGt: args.episodeIndexGt == null ? null : Spanner.float(args.episodeIndexGt),
      limit: args.limit.toString(),
    },
    types: {
      seasonPublisherIdEq: { type: "string" },
      episodeSeasonIdEq: { type: "string" },
      episodeIndexGt: { type: "float64" },
      limit: { type: "int64" },
    }
  });
  let resRows = new Array<ListNextEpisodesForPublisherRow>();
  for (let row of rows) {
    resRows.push({
      episodeSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      episodeEpisodeId: row.at(1).value == null ? undefined : row.at(1).value,
      episodeIndex: row.at(2).value == null ? undefined : row.at(2).value.value,
      episodeName: row.at(3).value == null ? undefined : row.at(3).value,
      episodeVideoContainerId: row.at(4).value == null ? undefined : row.at(4).value,
      episodeVideoContainer: row.at(5).value == null ? undefined : deserializeMessage(row.at(5).value, VIDEO_CONTAINER),
      episodeState: row.at(6).value == null ? undefined : toEnumFromNumber(row.at(6).value.value, EPISODE_STATE),
      episodePremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
    });
  }
  return resRows;
}

export interface GetEpisodeForPublisherRow {
  episodeSeasonId?: string,
  episodeEpisodeId?: string,
  episodeIndex?: number,
  episodeName?: string,
  episodeVideoContainerId?: string,
  episodeVideoContainer?: VideoContainer,
  episodeState?: EpisodeState,
  episodePremiereTimeMs?: number,
}

export let GET_EPISODE_FOR_PUBLISHER_ROW: MessageDescriptor<GetEpisodeForPublisherRow> = {
  name: 'GetEpisodeForPublisherRow',
  fields: [{
    name: 'episodeSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeEpisodeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeIndex',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'episodeName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainerId',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainer',
    index: 6,
    messageType: VIDEO_CONTAINER,
  }, {
    name: 'episodeState',
    index: 7,
    enumType: EPISODE_STATE,
  }, {
    name: 'episodePremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getEpisodeForPublisher(
  runner: Database | Transaction,
  args: {
    seasonPublisherIdEq?: string,
    episodeSeasonIdEq: string,
    episodeEpisodeIdEq: string,
  }
): Promise<Array<GetEpisodeForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.seasonId, e.episodeId, e.index, e.name, e.videoContainerId, e.videoContainer, e.state, e.premiereTimeMs FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (s.publisherId = @seasonPublisherIdEq AND e.seasonId = @episodeSeasonIdEq AND e.episodeId = @episodeEpisodeIdEq)",
    params: {
      seasonPublisherIdEq: args.seasonPublisherIdEq == null ? null : args.seasonPublisherIdEq,
      episodeSeasonIdEq: args.episodeSeasonIdEq,
      episodeEpisodeIdEq: args.episodeEpisodeIdEq,
    },
    types: {
      seasonPublisherIdEq: { type: "string" },
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetEpisodeForPublisherRow>();
  for (let row of rows) {
    resRows.push({
      episodeSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      episodeEpisodeId: row.at(1).value == null ? undefined : row.at(1).value,
      episodeIndex: row.at(2).value == null ? undefined : row.at(2).value.value,
      episodeName: row.at(3).value == null ? undefined : row.at(3).value,
      episodeVideoContainerId: row.at(4).value == null ? undefined : row.at(4).value,
      episodeVideoContainer: row.at(5).value == null ? undefined : deserializeMessage(row.at(5).value, VIDEO_CONTAINER),
      episodeState: row.at(6).value == null ? undefined : toEnumFromNumber(row.at(6).value.value, EPISODE_STATE),
      episodePremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
    });
  }
  return resRows;
}

export interface CheckPresenceOfEpisodeForPublisherRow {
  episodeState?: EpisodeState,
}

export let CHECK_PRESENCE_OF_EPISODE_FOR_PUBLISHER_ROW: MessageDescriptor<CheckPresenceOfEpisodeForPublisherRow> = {
  name: 'CheckPresenceOfEpisodeForPublisherRow',
  fields: [{
    name: 'episodeState',
    index: 1,
    enumType: EPISODE_STATE,
  }],
};

export async function checkPresenceOfEpisodeForPublisher(
  runner: Database | Transaction,
  args: {
    seasonPublisherIdEq?: string,
    episodeSeasonIdEq: string,
    episodeEpisodeIdEq: string,
  }
): Promise<Array<CheckPresenceOfEpisodeForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.state FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (s.publisherId = @seasonPublisherIdEq AND e.seasonId = @episodeSeasonIdEq AND e.episodeId = @episodeEpisodeIdEq)",
    params: {
      seasonPublisherIdEq: args.seasonPublisherIdEq == null ? null : args.seasonPublisherIdEq,
      episodeSeasonIdEq: args.episodeSeasonIdEq,
      episodeEpisodeIdEq: args.episodeEpisodeIdEq,
    },
    types: {
      seasonPublisherIdEq: { type: "string" },
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<CheckPresenceOfEpisodeForPublisherRow>();
  for (let row of rows) {
    resRows.push({
      episodeState: row.at(0).value == null ? undefined : toEnumFromNumber(row.at(0).value.value, EPISODE_STATE),
    });
  }
  return resRows;
}

export interface ListRecentEpisodesByPremiereTimeRow {
  episodePremiereTimeMs?: number,
}

export let LIST_RECENT_EPISODES_BY_PREMIERE_TIME_ROW: MessageDescriptor<ListRecentEpisodesByPremiereTimeRow> = {
  name: 'ListRecentEpisodesByPremiereTimeRow',
  fields: [{
    name: 'episodePremiereTimeMs',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listRecentEpisodesByPremiereTime(
  runner: Database | Transaction,
  args: {
    episodeSeasonIdEq: string,
    episodePremiereTimeMsLt?: number,
    limit: number,
  }
): Promise<Array<ListRecentEpisodesByPremiereTimeRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Episode.premiereTimeMs FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.premiereTimeMs < @episodePremiereTimeMsLt) ORDER BY Episode.premiereTimeMs DESC LIMIT @limit",
    params: {
      episodeSeasonIdEq: args.episodeSeasonIdEq,
      episodePremiereTimeMsLt: args.episodePremiereTimeMsLt == null ? null : Spanner.float(args.episodePremiereTimeMsLt),
      limit: args.limit.toString(),
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodePremiereTimeMsLt: { type: "float64" },
      limit: { type: "int64" },
    }
  });
  let resRows = new Array<ListRecentEpisodesByPremiereTimeRow>();
  for (let row of rows) {
    resRows.push({
      episodePremiereTimeMs: row.at(0).value == null ? undefined : row.at(0).value.value,
    });
  }
  return resRows;
}

export interface GetSeasonAndEpisodeRow {
  seasonSeasonId?: string,
  seasonPublisherId?: string,
  seasonState?: SeasonState,
  seasonName?: string,
  seasonCoverImageR2Filename?: string,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimeMs?: number,
  seasonRecentPremiereTimeMs?: number,
  seasonRatingsCount?: number,
  seasonAverageRating?: number,
  episodeSeasonId?: string,
  episodeEpisodeId?: string,
  episodeIndex?: number,
  episodeName?: string,
  episodeVideoContainerId?: string,
  episodeVideoContainer?: VideoContainer,
  episodeState?: EpisodeState,
  episodePremiereTimeMs?: number,
}

export let GET_SEASON_AND_EPISODE_ROW: MessageDescriptor<GetSeasonAndEpisodeRow> = {
  name: 'GetSeasonAndEpisodeRow',
  fields: [{
    name: 'seasonSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'seasonName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingsCount',
    index: 9,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonAverageRating',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'episodeSeasonId',
    index: 11,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeEpisodeId',
    index: 12,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeIndex',
    index: 13,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'episodeName',
    index: 14,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainerId',
    index: 15,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainer',
    index: 16,
    messageType: VIDEO_CONTAINER,
  }, {
    name: 'episodeState',
    index: 17,
    enumType: EPISODE_STATE,
  }, {
    name: 'episodePremiereTimeMs',
    index: 18,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getSeasonAndEpisode(
  runner: Database | Transaction,
  args: {
    episodeSeasonIdEq: string,
    episodeEpisodeIdEq: string,
  }
): Promise<Array<GetSeasonAndEpisodeRow>> {
  let [rows] = await runner.run({
    sql: "SELECT s.seasonId, s.publisherId, s.state, s.name, s.coverImageR2Filename, s.totalEpisodes, s.lastChangeTimeMs, s.recentPremiereTimeMs, s.ratingsCount, s.averageRating, e.seasonId, e.episodeId, e.index, e.name, e.videoContainerId, e.videoContainer, e.state, e.premiereTimeMs FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (e.seasonId = @episodeSeasonIdEq AND e.episodeId = @episodeEpisodeIdEq)",
    params: {
      episodeSeasonIdEq: args.episodeSeasonIdEq,
      episodeEpisodeIdEq: args.episodeEpisodeIdEq,
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonAndEpisodeRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      seasonName: row.at(3).value == null ? undefined : row.at(3).value,
      seasonCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      seasonTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      seasonLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      seasonRecentPremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      seasonRatingsCount: row.at(8).value == null ? undefined : row.at(8).value.value,
      seasonAverageRating: row.at(9).value == null ? undefined : row.at(9).value.value,
      episodeSeasonId: row.at(10).value == null ? undefined : row.at(10).value,
      episodeEpisodeId: row.at(11).value == null ? undefined : row.at(11).value,
      episodeIndex: row.at(12).value == null ? undefined : row.at(12).value.value,
      episodeName: row.at(13).value == null ? undefined : row.at(13).value,
      episodeVideoContainerId: row.at(14).value == null ? undefined : row.at(14).value,
      episodeVideoContainer: row.at(15).value == null ? undefined : deserializeMessage(row.at(15).value, VIDEO_CONTAINER),
      episodeState: row.at(16).value == null ? undefined : toEnumFromNumber(row.at(16).value.value, EPISODE_STATE),
      episodePremiereTimeMs: row.at(17).value == null ? undefined : row.at(17).value.value,
    });
  }
  return resRows;
}

export interface GetSeasonAndEpisodeForPublisherRow {
  seasonSeasonId?: string,
  seasonPublisherId?: string,
  seasonState?: SeasonState,
  seasonName?: string,
  seasonCoverImageR2Filename?: string,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimeMs?: number,
  seasonRecentPremiereTimeMs?: number,
  seasonRatingsCount?: number,
  seasonAverageRating?: number,
  episodeSeasonId?: string,
  episodeEpisodeId?: string,
  episodeIndex?: number,
  episodeName?: string,
  episodeVideoContainerId?: string,
  episodeVideoContainer?: VideoContainer,
  episodeState?: EpisodeState,
  episodePremiereTimeMs?: number,
}

export let GET_SEASON_AND_EPISODE_FOR_PUBLISHER_ROW: MessageDescriptor<GetSeasonAndEpisodeForPublisherRow> = {
  name: 'GetSeasonAndEpisodeForPublisherRow',
  fields: [{
    name: 'seasonSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'seasonName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRecentPremiereTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingsCount',
    index: 9,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonAverageRating',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'episodeSeasonId',
    index: 11,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeEpisodeId',
    index: 12,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeIndex',
    index: 13,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'episodeName',
    index: 14,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainerId',
    index: 15,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeVideoContainer',
    index: 16,
    messageType: VIDEO_CONTAINER,
  }, {
    name: 'episodeState',
    index: 17,
    enumType: EPISODE_STATE,
  }, {
    name: 'episodePremiereTimeMs',
    index: 18,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getSeasonAndEpisodeForPublisher(
  runner: Database | Transaction,
  args: {
    seasonPublisherIdEq?: string,
    episodeSeasonIdEq: string,
    episodeEpisodeIdEq: string,
  }
): Promise<Array<GetSeasonAndEpisodeForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT s.seasonId, s.publisherId, s.state, s.name, s.coverImageR2Filename, s.totalEpisodes, s.lastChangeTimeMs, s.recentPremiereTimeMs, s.ratingsCount, s.averageRating, e.seasonId, e.episodeId, e.index, e.name, e.videoContainerId, e.videoContainer, e.state, e.premiereTimeMs FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (s.publisherId = @seasonPublisherIdEq AND e.seasonId = @episodeSeasonIdEq AND e.episodeId = @episodeEpisodeIdEq)",
    params: {
      seasonPublisherIdEq: args.seasonPublisherIdEq == null ? null : args.seasonPublisherIdEq,
      episodeSeasonIdEq: args.episodeSeasonIdEq,
      episodeEpisodeIdEq: args.episodeEpisodeIdEq,
    },
    types: {
      seasonPublisherIdEq: { type: "string" },
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonAndEpisodeForPublisherRow>();
  for (let row of rows) {
    resRows.push({
      seasonSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      seasonState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      seasonName: row.at(3).value == null ? undefined : row.at(3).value,
      seasonCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      seasonTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      seasonLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      seasonRecentPremiereTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      seasonRatingsCount: row.at(8).value == null ? undefined : row.at(8).value.value,
      seasonAverageRating: row.at(9).value == null ? undefined : row.at(9).value.value,
      episodeSeasonId: row.at(10).value == null ? undefined : row.at(10).value,
      episodeEpisodeId: row.at(11).value == null ? undefined : row.at(11).value,
      episodeIndex: row.at(12).value == null ? undefined : row.at(12).value.value,
      episodeName: row.at(13).value == null ? undefined : row.at(13).value,
      episodeVideoContainerId: row.at(14).value == null ? undefined : row.at(14).value,
      episodeVideoContainer: row.at(15).value == null ? undefined : deserializeMessage(row.at(15).value, VIDEO_CONTAINER),
      episodeState: row.at(16).value == null ? undefined : toEnumFromNumber(row.at(16).value.value, EPISODE_STATE),
      episodePremiereTimeMs: row.at(17).value == null ? undefined : row.at(17).value.value,
    });
  }
  return resRows;
}
