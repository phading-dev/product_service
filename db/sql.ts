import { SeasonState, SEASON_STATE } from '@phading/product_service_interface/show/season_state';
import { Spanner, Database, Transaction } from '@google-cloud/spanner';
import { Statement } from '@google-cloud/spanner/build/src/transaction';
import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';
import { toEnumFromNumber, serializeMessage, deserializeMessage } from '@selfage/message/serializer';
import { VideoContainer, VIDEO_CONTAINER } from '@phading/product_service_interface/show/video_container';

export function insertSeasonStatement(
  args: {
    seasonId: string,
    publisherId?: string,
    state?: SeasonState,
    name?: string,
    coverImageR2Filename?: string,
    totalEpisodes?: number,
    lastChangeTimeMs?: number,
    recentPremierTimeMs?: number,
    description?: string,
    createdTimeMs?: number,
  }
): Statement {
  return {
    sql: "INSERT Season (seasonId, publisherId, state, name, coverImageR2Filename, totalEpisodes, lastChangeTimeMs, recentPremierTimeMs, description, createdTimeMs) VALUES (@seasonId, @publisherId, @state, @name, @coverImageR2Filename, @totalEpisodes, @lastChangeTimeMs, @recentPremierTimeMs, @description, @createdTimeMs)",
    params: {
      seasonId: args.seasonId,
      publisherId: args.publisherId == null ? null : args.publisherId,
      state: args.state == null ? null : Spanner.float(args.state),
      name: args.name == null ? null : args.name,
      coverImageR2Filename: args.coverImageR2Filename == null ? null : args.coverImageR2Filename,
      totalEpisodes: args.totalEpisodes == null ? null : Spanner.float(args.totalEpisodes),
      lastChangeTimeMs: args.lastChangeTimeMs == null ? null : Spanner.float(args.lastChangeTimeMs),
      recentPremierTimeMs: args.recentPremierTimeMs == null ? null : Spanner.float(args.recentPremierTimeMs),
      description: args.description == null ? null : args.description,
      createdTimeMs: args.createdTimeMs == null ? null : Spanner.float(args.createdTimeMs),
    },
    types: {
      seasonId: { type: "string" },
      publisherId: { type: "string" },
      state: { type: "float64" },
      name: { type: "string" },
      coverImageR2Filename: { type: "string" },
      totalEpisodes: { type: "float64" },
      lastChangeTimeMs: { type: "float64" },
      recentPremierTimeMs: { type: "float64" },
      description: { type: "string" },
      createdTimeMs: { type: "float64" },
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
  seasonRecentPremierTimeMs?: number,
  seasonDescription?: string,
  seasonCreatedTimeMs?: number,
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
    name: 'seasonRecentPremierTimeMs',
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
  }],
};

export async function getSeason(
  runner: Database | Transaction,
  args: {
    seasonSeasonIdEq: string,
  }
): Promise<Array<GetSeasonRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Season.seasonId, Season.publisherId, Season.state, Season.name, Season.coverImageR2Filename, Season.totalEpisodes, Season.lastChangeTimeMs, Season.recentPremierTimeMs, Season.description, Season.createdTimeMs FROM Season WHERE (Season.seasonId = @seasonSeasonIdEq)",
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
      seasonRecentPremierTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      seasonDescription: row.at(8).value == null ? undefined : row.at(8).value,
      seasonCreatedTimeMs: row.at(9).value == null ? undefined : row.at(9).value.value,
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
    premierTimeMs?: number,
    publishTimeMs?: number,
  }
): Statement {
  return {
    sql: "INSERT Episode (seasonId, episodeId, index, name, videoContainerId, videoContainer, premierTimeMs, publishTimeMs) VALUES (@seasonId, @episodeId, @index, @name, @videoContainerId, @videoContainer, @premierTimeMs, @publishTimeMs)",
    params: {
      seasonId: args.seasonId,
      episodeId: args.episodeId,
      index: args.index == null ? null : Spanner.float(args.index),
      name: args.name == null ? null : args.name,
      videoContainerId: args.videoContainerId == null ? null : args.videoContainerId,
      videoContainer: args.videoContainer == null ? null : Buffer.from(serializeMessage(args.videoContainer, VIDEO_CONTAINER).buffer),
      premierTimeMs: args.premierTimeMs == null ? null : Spanner.float(args.premierTimeMs),
      publishTimeMs: args.publishTimeMs == null ? null : Spanner.float(args.publishTimeMs),
    },
    types: {
      seasonId: { type: "string" },
      episodeId: { type: "string" },
      index: { type: "float64" },
      name: { type: "string" },
      videoContainerId: { type: "string" },
      videoContainer: { type: "bytes" },
      premierTimeMs: { type: "float64" },
      publishTimeMs: { type: "float64" },
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
  episodePremierTimeMs?: number,
  episodePublishTimeMs?: number,
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
    name: 'episodePremierTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'episodePublishTimeMs',
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
    sql: "SELECT Episode.seasonId, Episode.episodeId, Episode.index, Episode.name, Episode.videoContainerId, Episode.videoContainer, Episode.premierTimeMs, Episode.publishTimeMs FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
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
      episodePremierTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      episodePublishTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
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

export function insertSeasonRatingStatement(
  args: {
    seasonId: string,
    totalRatings?: number,
    count?: number,
    averageRating?: number,
    updatedTimeMs?: number,
  }
): Statement {
  return {
    sql: "INSERT SeasonRating (seasonId, totalRatings, count, averageRating, updatedTimeMs) VALUES (@seasonId, @totalRatings, @count, @averageRating, @updatedTimeMs)",
    params: {
      seasonId: args.seasonId,
      totalRatings: args.totalRatings == null ? null : Spanner.float(args.totalRatings),
      count: args.count == null ? null : Spanner.float(args.count),
      averageRating: args.averageRating == null ? null : Spanner.float(args.averageRating),
      updatedTimeMs: args.updatedTimeMs == null ? null : Spanner.float(args.updatedTimeMs),
    },
    types: {
      seasonId: { type: "string" },
      totalRatings: { type: "float64" },
      count: { type: "float64" },
      averageRating: { type: "float64" },
      updatedTimeMs: { type: "float64" },
    }
  };
}

export function deleteSeasonRatingStatement(
  args: {
    seasonRatingSeasonIdEq: string,
  }
): Statement {
  return {
    sql: "DELETE SeasonRating WHERE (SeasonRating.seasonId = @seasonRatingSeasonIdEq)",
    params: {
      seasonRatingSeasonIdEq: args.seasonRatingSeasonIdEq,
    },
    types: {
      seasonRatingSeasonIdEq: { type: "string" },
    }
  };
}

export interface GetSeasonRatingRow {
  seasonRatingSeasonId?: string,
  seasonRatingTotalRatings?: number,
  seasonRatingCount?: number,
  seasonRatingAverageRating?: number,
  seasonRatingUpdatedTimeMs?: number,
}

export let GET_SEASON_RATING_ROW: MessageDescriptor<GetSeasonRatingRow> = {
  name: 'GetSeasonRatingRow',
  fields: [{
    name: 'seasonRatingSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonRatingTotalRatings',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingCount',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingAverageRating',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'seasonRatingUpdatedTimeMs',
    index: 5,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getSeasonRating(
  runner: Database | Transaction,
  args: {
    seasonRatingSeasonIdEq: string,
  }
): Promise<Array<GetSeasonRatingRow>> {
  let [rows] = await runner.run({
    sql: "SELECT SeasonRating.seasonId, SeasonRating.totalRatings, SeasonRating.count, SeasonRating.averageRating, SeasonRating.updatedTimeMs FROM SeasonRating WHERE (SeasonRating.seasonId = @seasonRatingSeasonIdEq)",
    params: {
      seasonRatingSeasonIdEq: args.seasonRatingSeasonIdEq,
    },
    types: {
      seasonRatingSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonRatingRow>();
  for (let row of rows) {
    resRows.push({
      seasonRatingSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      seasonRatingTotalRatings: row.at(1).value == null ? undefined : row.at(1).value.value,
      seasonRatingCount: row.at(2).value == null ? undefined : row.at(2).value.value,
      seasonRatingAverageRating: row.at(3).value == null ? undefined : row.at(3).value.value,
      seasonRatingUpdatedTimeMs: row.at(4).value == null ? undefined : row.at(4).value.value,
    });
  }
  return resRows;
}

export function updateSeasonRatingStatement(
  args: {
    seasonRatingSeasonIdEq: string,
    setTotalRatings?: number,
    setCount?: number,
    setAverageRating?: number,
    setUpdatedTimeMs?: number,
  }
): Statement {
  return {
    sql: "UPDATE SeasonRating SET totalRatings = @setTotalRatings, count = @setCount, averageRating = @setAverageRating, updatedTimeMs = @setUpdatedTimeMs WHERE (SeasonRating.seasonId = @seasonRatingSeasonIdEq)",
    params: {
      seasonRatingSeasonIdEq: args.seasonRatingSeasonIdEq,
      setTotalRatings: args.setTotalRatings == null ? null : Spanner.float(args.setTotalRatings),
      setCount: args.setCount == null ? null : Spanner.float(args.setCount),
      setAverageRating: args.setAverageRating == null ? null : Spanner.float(args.setAverageRating),
      setUpdatedTimeMs: args.setUpdatedTimeMs == null ? null : Spanner.float(args.setUpdatedTimeMs),
    },
    types: {
      seasonRatingSeasonIdEq: { type: "string" },
      setTotalRatings: { type: "float64" },
      setCount: { type: "float64" },
      setAverageRating: { type: "float64" },
      setUpdatedTimeMs: { type: "float64" },
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
    setRecentPremierTimeMs?: number,
    setLastChangeTimeMs?: number,
  }
): Statement {
  return {
    sql: "UPDATE Season SET state = @setState, recentPremierTimeMs = @setRecentPremierTimeMs, lastChangeTimeMs = @setLastChangeTimeMs WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: args.seasonSeasonIdEq,
      setState: args.setState == null ? null : Spanner.float(args.setState),
      setRecentPremierTimeMs: args.setRecentPremierTimeMs == null ? null : Spanner.float(args.setRecentPremierTimeMs),
      setLastChangeTimeMs: args.setLastChangeTimeMs == null ? null : Spanner.float(args.setLastChangeTimeMs),
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
      setState: { type: "float64" },
      setRecentPremierTimeMs: { type: "float64" },
      setLastChangeTimeMs: { type: "float64" },
    }
  };
}

export function updateSeasonPremierTimeStatement(
  args: {
    seasonSeasonIdEq: string,
    setRecentPremierTimeMs?: number,
    setLastChangeTimeMs?: number,
  }
): Statement {
  return {
    sql: "UPDATE Season SET recentPremierTimeMs = @setRecentPremierTimeMs, lastChangeTimeMs = @setLastChangeTimeMs WHERE Season.seasonId = @seasonSeasonIdEq",
    params: {
      seasonSeasonIdEq: args.seasonSeasonIdEq,
      setRecentPremierTimeMs: args.setRecentPremierTimeMs == null ? null : Spanner.float(args.setRecentPremierTimeMs),
      setLastChangeTimeMs: args.setLastChangeTimeMs == null ? null : Spanner.float(args.setLastChangeTimeMs),
    },
    types: {
      seasonSeasonIdEq: { type: "string" },
      setRecentPremierTimeMs: { type: "float64" },
      setLastChangeTimeMs: { type: "float64" },
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
    setPublishTimeMs?: number,
    setPremierTimeMs?: number,
  }
): Statement {
  return {
    sql: "UPDATE Episode SET publishTimeMs = @setPublishTimeMs, premierTimeMs = @setPremierTimeMs WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
    params: {
      episodeSeasonIdEq: args.episodeSeasonIdEq,
      episodeEpisodeIdEq: args.episodeEpisodeIdEq,
      setPublishTimeMs: args.setPublishTimeMs == null ? null : Spanner.float(args.setPublishTimeMs),
      setPremierTimeMs: args.setPremierTimeMs == null ? null : Spanner.float(args.setPremierTimeMs),
    },
    types: {
      episodeSeasonIdEq: { type: "string" },
      episodeEpisodeIdEq: { type: "string" },
      setPublishTimeMs: { type: "float64" },
      setPremierTimeMs: { type: "float64" },
    }
  };
}

export function updateEpisodeNameStatement(
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

export interface GetSeasonForPublisherRow {
  seasonSeasonId?: string,
  seasonPublisherId?: string,
  seasonState?: SeasonState,
  seasonName?: string,
  seasonCoverImageR2Filename?: string,
  seasonTotalEpisodes?: number,
  seasonLastChangeTimeMs?: number,
  seasonRecentPremierTimeMs?: number,
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
    name: 'seasonRecentPremierTimeMs',
    index: 8,
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
    sql: "SELECT Season.seasonId, Season.publisherId, Season.state, Season.name, Season.coverImageR2Filename, Season.totalEpisodes, Season.lastChangeTimeMs, Season.recentPremierTimeMs FROM Season WHERE (Season.publisherId = @seasonPublisherIdEq AND Season.seasonId = @seasonSeasonIdEq)",
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
      seasonRecentPremierTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
    });
  }
  return resRows;
}

export interface GetSeasonAllAndRatingForPublisherRow {
  sSeasonId?: string,
  sPublisherId?: string,
  sState?: SeasonState,
  sName?: string,
  sCoverImageR2Filename?: string,
  sTotalEpisodes?: number,
  sLastChangeTimeMs?: number,
  sRecentPremierTimeMs?: number,
  sDescription?: string,
  sCreatedTimeMs?: number,
  srSeasonId?: string,
  srTotalRatings?: number,
  srCount?: number,
  srAverageRating?: number,
  srUpdatedTimeMs?: number,
}

export let GET_SEASON_ALL_AND_RATING_FOR_PUBLISHER_ROW: MessageDescriptor<GetSeasonAllAndRatingForPublisherRow> = {
  name: 'GetSeasonAllAndRatingForPublisherRow',
  fields: [{
    name: 'sSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'sName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'sLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'sRecentPremierTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'sDescription',
    index: 9,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sCreatedTimeMs',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srSeasonId',
    index: 11,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'srTotalRatings',
    index: 12,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srCount',
    index: 13,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srAverageRating',
    index: 14,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srUpdatedTimeMs',
    index: 15,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getSeasonAllAndRatingForPublisher(
  runner: Database | Transaction,
  args: {
    sPublisherIdEq?: string,
    sSeasonIdEq: string,
  }
): Promise<Array<GetSeasonAllAndRatingForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT s.seasonId, s.publisherId, s.state, s.name, s.coverImageR2Filename, s.totalEpisodes, s.lastChangeTimeMs, s.recentPremierTimeMs, s.description, s.createdTimeMs, sr.seasonId, sr.totalRatings, sr.count, sr.averageRating, sr.updatedTimeMs FROM Season AS s LEFT JOIN SeasonRating AS sr ON s.seasonId = sr.seasonId WHERE (s.publisherId = @sPublisherIdEq AND s.seasonId = @sSeasonIdEq)",
    params: {
      sPublisherIdEq: args.sPublisherIdEq == null ? null : args.sPublisherIdEq,
      sSeasonIdEq: args.sSeasonIdEq,
    },
    types: {
      sPublisherIdEq: { type: "string" },
      sSeasonIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonAllAndRatingForPublisherRow>();
  for (let row of rows) {
    resRows.push({
      sSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      sPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      sState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      sName: row.at(3).value == null ? undefined : row.at(3).value,
      sCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      sTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      sLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      sRecentPremierTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      sDescription: row.at(8).value == null ? undefined : row.at(8).value,
      sCreatedTimeMs: row.at(9).value == null ? undefined : row.at(9).value.value,
      srSeasonId: row.at(10).value == null ? undefined : row.at(10).value,
      srTotalRatings: row.at(11).value == null ? undefined : row.at(11).value.value,
      srCount: row.at(12).value == null ? undefined : row.at(12).value.value,
      srAverageRating: row.at(13).value == null ? undefined : row.at(13).value.value,
      srUpdatedTimeMs: row.at(14).value == null ? undefined : row.at(14).value.value,
    });
  }
  return resRows;
}

export interface ListSeasonsForPublisherRow {
  sSeasonId?: string,
  sPublisherId?: string,
  sState?: SeasonState,
  sName?: string,
  sCoverImageR2Filename?: string,
  sTotalEpisodes?: number,
  sLastChangeTimeMs?: number,
  sRecentPremierTimeMs?: number,
  srSeasonId?: string,
  srTotalRatings?: number,
  srCount?: number,
  srAverageRating?: number,
  srUpdatedTimeMs?: number,
}

export let LIST_SEASONS_FOR_PUBLISHER_ROW: MessageDescriptor<ListSeasonsForPublisherRow> = {
  name: 'ListSeasonsForPublisherRow',
  fields: [{
    name: 'sSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'sName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'sLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'sRecentPremierTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srSeasonId',
    index: 9,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'srTotalRatings',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srCount',
    index: 11,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srAverageRating',
    index: 12,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srUpdatedTimeMs',
    index: 13,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listSeasonsForPublisher(
  runner: Database | Transaction,
  args: {
    sPublisherIdEq?: string,
    sStateEq?: SeasonState,
    sLastChangeTimeMsLt?: number,
    limit: number,
  }
): Promise<Array<ListSeasonsForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT s.seasonId, s.publisherId, s.state, s.name, s.coverImageR2Filename, s.totalEpisodes, s.lastChangeTimeMs, s.recentPremierTimeMs, sr.seasonId, sr.totalRatings, sr.count, sr.averageRating, sr.updatedTimeMs FROM Season AS s LEFT JOIN SeasonRating AS sr ON s.seasonId = sr.seasonId WHERE (s.publisherId = @sPublisherIdEq AND s.state = @sStateEq AND s.lastChangeTimeMs < @sLastChangeTimeMsLt) ORDER BY s.lastChangeTimeMs DESC LIMIT @limit",
    params: {
      sPublisherIdEq: args.sPublisherIdEq == null ? null : args.sPublisherIdEq,
      sStateEq: args.sStateEq == null ? null : Spanner.float(args.sStateEq),
      sLastChangeTimeMsLt: args.sLastChangeTimeMsLt == null ? null : Spanner.float(args.sLastChangeTimeMsLt),
      limit: args.limit.toString(),
    },
    types: {
      sPublisherIdEq: { type: "string" },
      sStateEq: { type: "float64" },
      sLastChangeTimeMsLt: { type: "float64" },
      limit: { type: "int64" },
    }
  });
  let resRows = new Array<ListSeasonsForPublisherRow>();
  for (let row of rows) {
    resRows.push({
      sSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      sPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      sState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      sName: row.at(3).value == null ? undefined : row.at(3).value,
      sCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      sTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      sLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      sRecentPremierTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      srSeasonId: row.at(8).value == null ? undefined : row.at(8).value,
      srTotalRatings: row.at(9).value == null ? undefined : row.at(9).value.value,
      srCount: row.at(10).value == null ? undefined : row.at(10).value.value,
      srAverageRating: row.at(11).value == null ? undefined : row.at(11).value.value,
      srUpdatedTimeMs: row.at(12).value == null ? undefined : row.at(12).value.value,
    });
  }
  return resRows;
}

export interface ListPublishedSeasonsByPublishTimeForConsumerRow {
  sSeasonId?: string,
  sPublisherId?: string,
  sState?: SeasonState,
  sName?: string,
  sCoverImageR2Filename?: string,
  sTotalEpisodes?: number,
  sLastChangeTimeMs?: number,
  sRecentPremierTimeMs?: number,
  srSeasonId?: string,
  srTotalRatings?: number,
  srCount?: number,
  srAverageRating?: number,
  srUpdatedTimeMs?: number,
}

export let LIST_PUBLISHED_SEASONS_BY_PUBLISH_TIME_FOR_CONSUMER_ROW: MessageDescriptor<ListPublishedSeasonsByPublishTimeForConsumerRow> = {
  name: 'ListPublishedSeasonsByPublishTimeForConsumerRow',
  fields: [{
    name: 'sSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'sName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'sLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'sRecentPremierTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srSeasonId',
    index: 9,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'srTotalRatings',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srCount',
    index: 11,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srAverageRating',
    index: 12,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srUpdatedTimeMs',
    index: 13,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listPublishedSeasonsByPublishTimeForConsumer(
  runner: Database | Transaction,
  args: {
    sStateEq?: SeasonState,
    sRecentPremierTimeMsLt?: number,
    limit: number,
  }
): Promise<Array<ListPublishedSeasonsByPublishTimeForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT s.seasonId, s.publisherId, s.state, s.name, s.coverImageR2Filename, s.totalEpisodes, s.lastChangeTimeMs, s.recentPremierTimeMs, sr.seasonId, sr.totalRatings, sr.count, sr.averageRating, sr.updatedTimeMs FROM Season AS s LEFT JOIN SeasonRating AS sr ON s.seasonId = sr.seasonId WHERE (s.state = @sStateEq AND s.recentPremierTimeMs < @sRecentPremierTimeMsLt) ORDER BY s.recentPremierTimeMs DESC LIMIT @limit",
    params: {
      sStateEq: args.sStateEq == null ? null : Spanner.float(args.sStateEq),
      sRecentPremierTimeMsLt: args.sRecentPremierTimeMsLt == null ? null : Spanner.float(args.sRecentPremierTimeMsLt),
      limit: args.limit.toString(),
    },
    types: {
      sStateEq: { type: "float64" },
      sRecentPremierTimeMsLt: { type: "float64" },
      limit: { type: "int64" },
    }
  });
  let resRows = new Array<ListPublishedSeasonsByPublishTimeForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      sSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      sPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      sState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      sName: row.at(3).value == null ? undefined : row.at(3).value,
      sCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      sTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      sLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      sRecentPremierTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      srSeasonId: row.at(8).value == null ? undefined : row.at(8).value,
      srTotalRatings: row.at(9).value == null ? undefined : row.at(9).value.value,
      srCount: row.at(10).value == null ? undefined : row.at(10).value.value,
      srAverageRating: row.at(11).value == null ? undefined : row.at(11).value.value,
      srUpdatedTimeMs: row.at(12).value == null ? undefined : row.at(12).value.value,
    });
  }
  return resRows;
}

export interface ListPublishedSeasonsByRatingForConsumerRow {
  sSeasonId?: string,
  sPublisherId?: string,
  sState?: SeasonState,
  sName?: string,
  sCoverImageR2Filename?: string,
  sTotalEpisodes?: number,
  sLastChangeTimeMs?: number,
  sRecentPremierTimeMs?: number,
  srSeasonId?: string,
  srTotalRatings?: number,
  srCount?: number,
  srAverageRating?: number,
  srUpdatedTimeMs?: number,
}

export let LIST_PUBLISHED_SEASONS_BY_RATING_FOR_CONSUMER_ROW: MessageDescriptor<ListPublishedSeasonsByRatingForConsumerRow> = {
  name: 'ListPublishedSeasonsByRatingForConsumerRow',
  fields: [{
    name: 'sSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'sName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'sLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'sRecentPremierTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srSeasonId',
    index: 9,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'srTotalRatings',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srCount',
    index: 11,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srAverageRating',
    index: 12,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srUpdatedTimeMs',
    index: 13,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listPublishedSeasonsByRatingForConsumer(
  runner: Database | Transaction,
  args: {
    sStateEq?: SeasonState,
    srAverageRatingLt?: number,
    srAverageRatingEq?: number,
    srUpdatedTimeMsLt?: number,
    limit: number,
  }
): Promise<Array<ListPublishedSeasonsByRatingForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT s.seasonId, s.publisherId, s.state, s.name, s.coverImageR2Filename, s.totalEpisodes, s.lastChangeTimeMs, s.recentPremierTimeMs, sr.seasonId, sr.totalRatings, sr.count, sr.averageRating, sr.updatedTimeMs FROM Season AS s INNER JOIN SeasonRating AS sr ON s.seasonId = sr.seasonId WHERE (s.state = @sStateEq AND (sr.averageRating < @srAverageRatingLt OR (sr.averageRating = @srAverageRatingEq AND sr.updatedTimeMs < @srUpdatedTimeMsLt))) ORDER BY sr.averageRating DESC, sr.updatedTimeMs DESC LIMIT @limit",
    params: {
      sStateEq: args.sStateEq == null ? null : Spanner.float(args.sStateEq),
      srAverageRatingLt: args.srAverageRatingLt == null ? null : Spanner.float(args.srAverageRatingLt),
      srAverageRatingEq: args.srAverageRatingEq == null ? null : Spanner.float(args.srAverageRatingEq),
      srUpdatedTimeMsLt: args.srUpdatedTimeMsLt == null ? null : Spanner.float(args.srUpdatedTimeMsLt),
      limit: args.limit.toString(),
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
      sSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      sPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      sState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      sName: row.at(3).value == null ? undefined : row.at(3).value,
      sCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      sTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      sLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      sRecentPremierTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      srSeasonId: row.at(8).value == null ? undefined : row.at(8).value,
      srTotalRatings: row.at(9).value == null ? undefined : row.at(9).value.value,
      srCount: row.at(10).value == null ? undefined : row.at(10).value.value,
      srAverageRating: row.at(11).value == null ? undefined : row.at(11).value.value,
      srUpdatedTimeMs: row.at(12).value == null ? undefined : row.at(12).value.value,
    });
  }
  return resRows;
}

export interface GetPublishedSeasonAndRatingForConsumerRow {
  sSeasonId?: string,
  sPublisherId?: string,
  sState?: SeasonState,
  sName?: string,
  sCoverImageR2Filename?: string,
  sTotalEpisodes?: number,
  sLastChangeTimeMs?: number,
  sRecentPremierTimeMs?: number,
  srSeasonId?: string,
  srTotalRatings?: number,
  srCount?: number,
  srAverageRating?: number,
  srUpdatedTimeMs?: number,
}

export let GET_PUBLISHED_SEASON_AND_RATING_FOR_CONSUMER_ROW: MessageDescriptor<GetPublishedSeasonAndRatingForConsumerRow> = {
  name: 'GetPublishedSeasonAndRatingForConsumerRow',
  fields: [{
    name: 'sSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'sName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'sLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'sRecentPremierTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srSeasonId',
    index: 9,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'srTotalRatings',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srCount',
    index: 11,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srAverageRating',
    index: 12,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srUpdatedTimeMs',
    index: 13,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getPublishedSeasonAndRatingForConsumer(
  runner: Database | Transaction,
  args: {
    sSeasonIdEq: string,
    sStateEq?: SeasonState,
  }
): Promise<Array<GetPublishedSeasonAndRatingForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT s.seasonId, s.publisherId, s.state, s.name, s.coverImageR2Filename, s.totalEpisodes, s.lastChangeTimeMs, s.recentPremierTimeMs, sr.seasonId, sr.totalRatings, sr.count, sr.averageRating, sr.updatedTimeMs FROM Season AS s LEFT JOIN SeasonRating AS sr ON s.seasonId = sr.seasonId WHERE (s.seasonId = @sSeasonIdEq AND s.state = @sStateEq)",
    params: {
      sSeasonIdEq: args.sSeasonIdEq,
      sStateEq: args.sStateEq == null ? null : Spanner.float(args.sStateEq),
    },
    types: {
      sSeasonIdEq: { type: "string" },
      sStateEq: { type: "float64" },
    }
  });
  let resRows = new Array<GetPublishedSeasonAndRatingForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      sSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      sPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      sState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      sName: row.at(3).value == null ? undefined : row.at(3).value,
      sCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      sTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      sLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      sRecentPremierTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      srSeasonId: row.at(8).value == null ? undefined : row.at(8).value,
      srTotalRatings: row.at(9).value == null ? undefined : row.at(9).value.value,
      srCount: row.at(10).value == null ? undefined : row.at(10).value.value,
      srAverageRating: row.at(11).value == null ? undefined : row.at(11).value.value,
      srUpdatedTimeMs: row.at(12).value == null ? undefined : row.at(12).value.value,
    });
  }
  return resRows;
}

export interface GetPublishedSeasonAllAndRatingForConsumerRow {
  sSeasonId?: string,
  sPublisherId?: string,
  sState?: SeasonState,
  sName?: string,
  sCoverImageR2Filename?: string,
  sTotalEpisodes?: number,
  sLastChangeTimeMs?: number,
  sRecentPremierTimeMs?: number,
  sDescription?: string,
  sCreatedTimeMs?: number,
  srSeasonId?: string,
  srTotalRatings?: number,
  srCount?: number,
  srAverageRating?: number,
  srUpdatedTimeMs?: number,
}

export let GET_PUBLISHED_SEASON_ALL_AND_RATING_FOR_CONSUMER_ROW: MessageDescriptor<GetPublishedSeasonAllAndRatingForConsumerRow> = {
  name: 'GetPublishedSeasonAllAndRatingForConsumerRow',
  fields: [{
    name: 'sSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'sName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'sLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'sRecentPremierTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'sDescription',
    index: 9,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sCreatedTimeMs',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srSeasonId',
    index: 11,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'srTotalRatings',
    index: 12,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srCount',
    index: 13,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srAverageRating',
    index: 14,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'srUpdatedTimeMs',
    index: 15,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getPublishedSeasonAllAndRatingForConsumer(
  runner: Database | Transaction,
  args: {
    sSeasonIdEq: string,
    sStateEq?: SeasonState,
  }
): Promise<Array<GetPublishedSeasonAllAndRatingForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT s.seasonId, s.publisherId, s.state, s.name, s.coverImageR2Filename, s.totalEpisodes, s.lastChangeTimeMs, s.recentPremierTimeMs, s.description, s.createdTimeMs, sr.seasonId, sr.totalRatings, sr.count, sr.averageRating, sr.updatedTimeMs FROM Season AS s LEFT JOIN SeasonRating AS sr ON s.seasonId = sr.seasonId WHERE (s.seasonId = @sSeasonIdEq AND s.state = @sStateEq)",
    params: {
      sSeasonIdEq: args.sSeasonIdEq,
      sStateEq: args.sStateEq == null ? null : Spanner.float(args.sStateEq),
    },
    types: {
      sSeasonIdEq: { type: "string" },
      sStateEq: { type: "float64" },
    }
  });
  let resRows = new Array<GetPublishedSeasonAllAndRatingForConsumerRow>();
  for (let row of rows) {
    resRows.push({
      sSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      sPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      sState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      sName: row.at(3).value == null ? undefined : row.at(3).value,
      sCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      sTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      sLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      sRecentPremierTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      sDescription: row.at(8).value == null ? undefined : row.at(8).value,
      sCreatedTimeMs: row.at(9).value == null ? undefined : row.at(9).value.value,
      srSeasonId: row.at(10).value == null ? undefined : row.at(10).value,
      srTotalRatings: row.at(11).value == null ? undefined : row.at(11).value.value,
      srCount: row.at(12).value == null ? undefined : row.at(12).value.value,
      srAverageRating: row.at(13).value == null ? undefined : row.at(13).value.value,
      srUpdatedTimeMs: row.at(14).value == null ? undefined : row.at(14).value.value,
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
  episodePublishTimeMs?: number,
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
  args: {
    episodeSeasonIdEq: string,
    episodeEpisodeIdEq: string,
  }
): Promise<Array<CheckPresenceOfEpisodeRow>> {
  let [rows] = await runner.run({
    sql: "SELECT Episode.publishTimeMs FROM Episode WHERE (Episode.seasonId = @episodeSeasonIdEq AND Episode.episodeId = @episodeEpisodeIdEq)",
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
      episodePublishTimeMs: row.at(0).value == null ? undefined : row.at(0).value.value,
    });
  }
  return resRows;
}

export interface GetPublishedEpisodeForConsumerRow {
  eSeasonId?: string,
  eEpisodeId?: string,
  eIndex?: number,
  eName?: string,
  eVideoContainerId?: string,
  eVideoContainer?: VideoContainer,
  ePremierTimeMs?: number,
  ePublishTimeMs?: number,
}

export let GET_PUBLISHED_EPISODE_FOR_CONSUMER_ROW: MessageDescriptor<GetPublishedEpisodeForConsumerRow> = {
  name: 'GetPublishedEpisodeForConsumerRow',
  fields: [{
    name: 'eSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eEpisodeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eIndex',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'eName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eVideoContainerId',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eVideoContainer',
    index: 6,
    messageType: VIDEO_CONTAINER,
  }, {
    name: 'ePremierTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'ePublishTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getPublishedEpisodeForConsumer(
  runner: Database | Transaction,
  args: {
    eSeasonIdEq: string,
    sStateEq?: SeasonState,
    eEpisodeIdEq: string,
    ePublishTimeMsLt?: number,
  }
): Promise<Array<GetPublishedEpisodeForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.seasonId, e.episodeId, e.index, e.name, e.videoContainerId, e.videoContainer, e.premierTimeMs, e.publishTimeMs FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (e.seasonId = @eSeasonIdEq AND s.state = @sStateEq AND e.episodeId = @eEpisodeIdEq AND e.publishTimeMs < @ePublishTimeMsLt)",
    params: {
      eSeasonIdEq: args.eSeasonIdEq,
      sStateEq: args.sStateEq == null ? null : Spanner.float(args.sStateEq),
      eEpisodeIdEq: args.eEpisodeIdEq,
      ePublishTimeMsLt: args.ePublishTimeMsLt == null ? null : Spanner.float(args.ePublishTimeMsLt),
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
      eSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      eEpisodeId: row.at(1).value == null ? undefined : row.at(1).value,
      eIndex: row.at(2).value == null ? undefined : row.at(2).value.value,
      eName: row.at(3).value == null ? undefined : row.at(3).value,
      eVideoContainerId: row.at(4).value == null ? undefined : row.at(4).value,
      eVideoContainer: row.at(5).value == null ? undefined : deserializeMessage(row.at(5).value, VIDEO_CONTAINER),
      ePremierTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      ePublishTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
    });
  }
  return resRows;
}

export interface ListNextPublishedEpisodesForConsumerRow {
  eSeasonId?: string,
  eEpisodeId?: string,
  eIndex?: number,
  eName?: string,
  eVideoContainerId?: string,
  eVideoContainer?: VideoContainer,
  ePremierTimeMs?: number,
  ePublishTimeMs?: number,
}

export let LIST_NEXT_PUBLISHED_EPISODES_FOR_CONSUMER_ROW: MessageDescriptor<ListNextPublishedEpisodesForConsumerRow> = {
  name: 'ListNextPublishedEpisodesForConsumerRow',
  fields: [{
    name: 'eSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eEpisodeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eIndex',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'eName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eVideoContainerId',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eVideoContainer',
    index: 6,
    messageType: VIDEO_CONTAINER,
  }, {
    name: 'ePremierTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'ePublishTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listNextPublishedEpisodesForConsumer(
  runner: Database | Transaction,
  args: {
    eSeasonIdEq: string,
    sStateEq?: SeasonState,
    eIndexGt?: number,
    ePublishTimeMsLt?: number,
    limit: number,
  }
): Promise<Array<ListNextPublishedEpisodesForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.seasonId, e.episodeId, e.index, e.name, e.videoContainerId, e.videoContainer, e.premierTimeMs, e.publishTimeMs FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (e.seasonId = @eSeasonIdEq AND s.state = @sStateEq AND e.index > @eIndexGt AND e.publishTimeMs < @ePublishTimeMsLt) ORDER BY e.index LIMIT @limit",
    params: {
      eSeasonIdEq: args.eSeasonIdEq,
      sStateEq: args.sStateEq == null ? null : Spanner.float(args.sStateEq),
      eIndexGt: args.eIndexGt == null ? null : Spanner.float(args.eIndexGt),
      ePublishTimeMsLt: args.ePublishTimeMsLt == null ? null : Spanner.float(args.ePublishTimeMsLt),
      limit: args.limit.toString(),
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
      eSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      eEpisodeId: row.at(1).value == null ? undefined : row.at(1).value,
      eIndex: row.at(2).value == null ? undefined : row.at(2).value.value,
      eName: row.at(3).value == null ? undefined : row.at(3).value,
      eVideoContainerId: row.at(4).value == null ? undefined : row.at(4).value,
      eVideoContainer: row.at(5).value == null ? undefined : deserializeMessage(row.at(5).value, VIDEO_CONTAINER),
      ePremierTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      ePublishTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
    });
  }
  return resRows;
}

export interface ListPrevPublishedEpisodesForConsumerRow {
  eSeasonId?: string,
  eEpisodeId?: string,
  eIndex?: number,
  eName?: string,
  eVideoContainerId?: string,
  eVideoContainer?: VideoContainer,
  ePremierTimeMs?: number,
  ePublishTimeMs?: number,
}

export let LIST_PREV_PUBLISHED_EPISODES_FOR_CONSUMER_ROW: MessageDescriptor<ListPrevPublishedEpisodesForConsumerRow> = {
  name: 'ListPrevPublishedEpisodesForConsumerRow',
  fields: [{
    name: 'eSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eEpisodeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eIndex',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'eName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eVideoContainerId',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eVideoContainer',
    index: 6,
    messageType: VIDEO_CONTAINER,
  }, {
    name: 'ePremierTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'ePublishTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listPrevPublishedEpisodesForConsumer(
  runner: Database | Transaction,
  args: {
    eSeasonIdEq: string,
    sStateEq?: SeasonState,
    eIndexLt?: number,
    ePublishTimeMsLt?: number,
    limit: number,
  }
): Promise<Array<ListPrevPublishedEpisodesForConsumerRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.seasonId, e.episodeId, e.index, e.name, e.videoContainerId, e.videoContainer, e.premierTimeMs, e.publishTimeMs FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (e.seasonId = @eSeasonIdEq AND s.state = @sStateEq AND e.index < @eIndexLt AND e.publishTimeMs < @ePublishTimeMsLt) ORDER BY e.index DESC LIMIT @limit",
    params: {
      eSeasonIdEq: args.eSeasonIdEq,
      sStateEq: args.sStateEq == null ? null : Spanner.float(args.sStateEq),
      eIndexLt: args.eIndexLt == null ? null : Spanner.float(args.eIndexLt),
      ePublishTimeMsLt: args.ePublishTimeMsLt == null ? null : Spanner.float(args.ePublishTimeMsLt),
      limit: args.limit.toString(),
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
      eSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      eEpisodeId: row.at(1).value == null ? undefined : row.at(1).value,
      eIndex: row.at(2).value == null ? undefined : row.at(2).value.value,
      eName: row.at(3).value == null ? undefined : row.at(3).value,
      eVideoContainerId: row.at(4).value == null ? undefined : row.at(4).value,
      eVideoContainer: row.at(5).value == null ? undefined : deserializeMessage(row.at(5).value, VIDEO_CONTAINER),
      ePremierTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      ePublishTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
    });
  }
  return resRows;
}

export interface ListPrevEpisodesForPublisherRow {
  eSeasonId?: string,
  eEpisodeId?: string,
  eIndex?: number,
  eName?: string,
  eVideoContainerId?: string,
  eVideoContainer?: VideoContainer,
  ePremierTimeMs?: number,
  ePublishTimeMs?: number,
}

export let LIST_PREV_EPISODES_FOR_PUBLISHER_ROW: MessageDescriptor<ListPrevEpisodesForPublisherRow> = {
  name: 'ListPrevEpisodesForPublisherRow',
  fields: [{
    name: 'eSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eEpisodeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eIndex',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'eName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eVideoContainerId',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eVideoContainer',
    index: 6,
    messageType: VIDEO_CONTAINER,
  }, {
    name: 'ePremierTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'ePublishTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listPrevEpisodesForPublisher(
  runner: Database | Transaction,
  args: {
    sPublisherIdEq?: string,
    eSeasonIdEq: string,
    eIndexLt?: number,
    limit: number,
  }
): Promise<Array<ListPrevEpisodesForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.seasonId, e.episodeId, e.index, e.name, e.videoContainerId, e.videoContainer, e.premierTimeMs, e.publishTimeMs FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (s.publisherId = @sPublisherIdEq AND e.seasonId = @eSeasonIdEq AND e.index < @eIndexLt) ORDER BY e.index DESC LIMIT @limit",
    params: {
      sPublisherIdEq: args.sPublisherIdEq == null ? null : args.sPublisherIdEq,
      eSeasonIdEq: args.eSeasonIdEq,
      eIndexLt: args.eIndexLt == null ? null : Spanner.float(args.eIndexLt),
      limit: args.limit.toString(),
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
      eSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      eEpisodeId: row.at(1).value == null ? undefined : row.at(1).value,
      eIndex: row.at(2).value == null ? undefined : row.at(2).value.value,
      eName: row.at(3).value == null ? undefined : row.at(3).value,
      eVideoContainerId: row.at(4).value == null ? undefined : row.at(4).value,
      eVideoContainer: row.at(5).value == null ? undefined : deserializeMessage(row.at(5).value, VIDEO_CONTAINER),
      ePremierTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      ePublishTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
    });
  }
  return resRows;
}

export interface ListNextEpisodesForPublisherRow {
  eSeasonId?: string,
  eEpisodeId?: string,
  eIndex?: number,
  eName?: string,
  eVideoContainerId?: string,
  eVideoContainer?: VideoContainer,
  ePremierTimeMs?: number,
  ePublishTimeMs?: number,
}

export let LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW: MessageDescriptor<ListNextEpisodesForPublisherRow> = {
  name: 'ListNextEpisodesForPublisherRow',
  fields: [{
    name: 'eSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eEpisodeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eIndex',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'eName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eVideoContainerId',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eVideoContainer',
    index: 6,
    messageType: VIDEO_CONTAINER,
  }, {
    name: 'ePremierTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'ePublishTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function listNextEpisodesForPublisher(
  runner: Database | Transaction,
  args: {
    sPublisherIdEq?: string,
    eSeasonIdEq: string,
    eIndexGt?: number,
    limit: number,
  }
): Promise<Array<ListNextEpisodesForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.seasonId, e.episodeId, e.index, e.name, e.videoContainerId, e.videoContainer, e.premierTimeMs, e.publishTimeMs FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (s.publisherId = @sPublisherIdEq AND e.seasonId = @eSeasonIdEq AND e.index > @eIndexGt) ORDER BY e.index LIMIT @limit",
    params: {
      sPublisherIdEq: args.sPublisherIdEq == null ? null : args.sPublisherIdEq,
      eSeasonIdEq: args.eSeasonIdEq,
      eIndexGt: args.eIndexGt == null ? null : Spanner.float(args.eIndexGt),
      limit: args.limit.toString(),
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
      eSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      eEpisodeId: row.at(1).value == null ? undefined : row.at(1).value,
      eIndex: row.at(2).value == null ? undefined : row.at(2).value.value,
      eName: row.at(3).value == null ? undefined : row.at(3).value,
      eVideoContainerId: row.at(4).value == null ? undefined : row.at(4).value,
      eVideoContainer: row.at(5).value == null ? undefined : deserializeMessage(row.at(5).value, VIDEO_CONTAINER),
      ePremierTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      ePublishTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
    });
  }
  return resRows;
}

export interface GetEpisodeForPublisherRow {
  eSeasonId?: string,
  eEpisodeId?: string,
  eIndex?: number,
  eName?: string,
  eVideoContainerId?: string,
  eVideoContainer?: VideoContainer,
  ePremierTimeMs?: number,
  ePublishTimeMs?: number,
}

export let GET_EPISODE_FOR_PUBLISHER_ROW: MessageDescriptor<GetEpisodeForPublisherRow> = {
  name: 'GetEpisodeForPublisherRow',
  fields: [{
    name: 'eSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eEpisodeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eIndex',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'eName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eVideoContainerId',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eVideoContainer',
    index: 6,
    messageType: VIDEO_CONTAINER,
  }, {
    name: 'ePremierTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'ePublishTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getEpisodeForPublisher(
  runner: Database | Transaction,
  args: {
    sPublisherIdEq?: string,
    eSeasonIdEq: string,
    eEpisodeIdEq: string,
  }
): Promise<Array<GetEpisodeForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.seasonId, e.episodeId, e.index, e.name, e.videoContainerId, e.videoContainer, e.premierTimeMs, e.publishTimeMs FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (s.publisherId = @sPublisherIdEq AND e.seasonId = @eSeasonIdEq AND e.episodeId = @eEpisodeIdEq)",
    params: {
      sPublisherIdEq: args.sPublisherIdEq == null ? null : args.sPublisherIdEq,
      eSeasonIdEq: args.eSeasonIdEq,
      eEpisodeIdEq: args.eEpisodeIdEq,
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
      eSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      eEpisodeId: row.at(1).value == null ? undefined : row.at(1).value,
      eIndex: row.at(2).value == null ? undefined : row.at(2).value.value,
      eName: row.at(3).value == null ? undefined : row.at(3).value,
      eVideoContainerId: row.at(4).value == null ? undefined : row.at(4).value,
      eVideoContainer: row.at(5).value == null ? undefined : deserializeMessage(row.at(5).value, VIDEO_CONTAINER),
      ePremierTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      ePublishTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
    });
  }
  return resRows;
}

export interface CheckPresenceOfEpisodeForPublisherRow {
  ePublishTimeMs?: number,
}

export let CHECK_PRESENCE_OF_EPISODE_FOR_PUBLISHER_ROW: MessageDescriptor<CheckPresenceOfEpisodeForPublisherRow> = {
  name: 'CheckPresenceOfEpisodeForPublisherRow',
  fields: [{
    name: 'ePublishTimeMs',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function checkPresenceOfEpisodeForPublisher(
  runner: Database | Transaction,
  args: {
    sPublisherIdEq?: string,
    eSeasonIdEq: string,
    eEpisodeIdEq: string,
  }
): Promise<Array<CheckPresenceOfEpisodeForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT e.publishTimeMs FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (s.publisherId = @sPublisherIdEq AND e.seasonId = @eSeasonIdEq AND e.episodeId = @eEpisodeIdEq)",
    params: {
      sPublisherIdEq: args.sPublisherIdEq == null ? null : args.sPublisherIdEq,
      eSeasonIdEq: args.eSeasonIdEq,
      eEpisodeIdEq: args.eEpisodeIdEq,
    },
    types: {
      sPublisherIdEq: { type: "string" },
      eSeasonIdEq: { type: "string" },
      eEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<CheckPresenceOfEpisodeForPublisherRow>();
  for (let row of rows) {
    resRows.push({
      ePublishTimeMs: row.at(0).value == null ? undefined : row.at(0).value.value,
    });
  }
  return resRows;
}

export interface GetSeasonAndEpisodeRow {
  sSeasonId?: string,
  sPublisherId?: string,
  sState?: SeasonState,
  sName?: string,
  sCoverImageR2Filename?: string,
  sTotalEpisodes?: number,
  sLastChangeTimeMs?: number,
  sRecentPremierTimeMs?: number,
  eSeasonId?: string,
  eEpisodeId?: string,
  eIndex?: number,
  eName?: string,
  eVideoContainerId?: string,
  eVideoContainer?: VideoContainer,
  ePremierTimeMs?: number,
  ePublishTimeMs?: number,
}

export let GET_SEASON_AND_EPISODE_ROW: MessageDescriptor<GetSeasonAndEpisodeRow> = {
  name: 'GetSeasonAndEpisodeRow',
  fields: [{
    name: 'sSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'sName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'sLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'sRecentPremierTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'eSeasonId',
    index: 9,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eEpisodeId',
    index: 10,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eIndex',
    index: 11,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'eName',
    index: 12,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eVideoContainerId',
    index: 13,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eVideoContainer',
    index: 14,
    messageType: VIDEO_CONTAINER,
  }, {
    name: 'ePremierTimeMs',
    index: 15,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'ePublishTimeMs',
    index: 16,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getSeasonAndEpisode(
  runner: Database | Transaction,
  args: {
    eSeasonIdEq: string,
    eEpisodeIdEq: string,
  }
): Promise<Array<GetSeasonAndEpisodeRow>> {
  let [rows] = await runner.run({
    sql: "SELECT s.seasonId, s.publisherId, s.state, s.name, s.coverImageR2Filename, s.totalEpisodes, s.lastChangeTimeMs, s.recentPremierTimeMs, e.seasonId, e.episodeId, e.index, e.name, e.videoContainerId, e.videoContainer, e.premierTimeMs, e.publishTimeMs FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (e.seasonId = @eSeasonIdEq AND e.episodeId = @eEpisodeIdEq)",
    params: {
      eSeasonIdEq: args.eSeasonIdEq,
      eEpisodeIdEq: args.eEpisodeIdEq,
    },
    types: {
      eSeasonIdEq: { type: "string" },
      eEpisodeIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetSeasonAndEpisodeRow>();
  for (let row of rows) {
    resRows.push({
      sSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      sPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      sState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      sName: row.at(3).value == null ? undefined : row.at(3).value,
      sCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      sTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      sLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      sRecentPremierTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      eSeasonId: row.at(8).value == null ? undefined : row.at(8).value,
      eEpisodeId: row.at(9).value == null ? undefined : row.at(9).value,
      eIndex: row.at(10).value == null ? undefined : row.at(10).value.value,
      eName: row.at(11).value == null ? undefined : row.at(11).value,
      eVideoContainerId: row.at(12).value == null ? undefined : row.at(12).value,
      eVideoContainer: row.at(13).value == null ? undefined : deserializeMessage(row.at(13).value, VIDEO_CONTAINER),
      ePremierTimeMs: row.at(14).value == null ? undefined : row.at(14).value.value,
      ePublishTimeMs: row.at(15).value == null ? undefined : row.at(15).value.value,
    });
  }
  return resRows;
}

export interface GetSeasonAndEpisodeForPublisherRow {
  sSeasonId?: string,
  sPublisherId?: string,
  sState?: SeasonState,
  sName?: string,
  sCoverImageR2Filename?: string,
  sTotalEpisodes?: number,
  sLastChangeTimeMs?: number,
  sRecentPremierTimeMs?: number,
  eSeasonId?: string,
  eEpisodeId?: string,
  eIndex?: number,
  eName?: string,
  eVideoContainerId?: string,
  eVideoContainer?: VideoContainer,
  ePremierTimeMs?: number,
  ePublishTimeMs?: number,
}

export let GET_SEASON_AND_EPISODE_FOR_PUBLISHER_ROW: MessageDescriptor<GetSeasonAndEpisodeForPublisherRow> = {
  name: 'GetSeasonAndEpisodeForPublisherRow',
  fields: [{
    name: 'sSeasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sPublisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sState',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'sName',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sCoverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'sTotalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'sLastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'sRecentPremierTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'eSeasonId',
    index: 9,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eEpisodeId',
    index: 10,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eIndex',
    index: 11,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'eName',
    index: 12,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eVideoContainerId',
    index: 13,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'eVideoContainer',
    index: 14,
    messageType: VIDEO_CONTAINER,
  }, {
    name: 'ePremierTimeMs',
    index: 15,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'ePublishTimeMs',
    index: 16,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getSeasonAndEpisodeForPublisher(
  runner: Database | Transaction,
  args: {
    sPublisherIdEq?: string,
    eSeasonIdEq: string,
    eEpisodeIdEq: string,
  }
): Promise<Array<GetSeasonAndEpisodeForPublisherRow>> {
  let [rows] = await runner.run({
    sql: "SELECT s.seasonId, s.publisherId, s.state, s.name, s.coverImageR2Filename, s.totalEpisodes, s.lastChangeTimeMs, s.recentPremierTimeMs, e.seasonId, e.episodeId, e.index, e.name, e.videoContainerId, e.videoContainer, e.premierTimeMs, e.publishTimeMs FROM Episode AS e INNER JOIN Season AS s ON e.seasonId = s.seasonId WHERE (s.publisherId = @sPublisherIdEq AND e.seasonId = @eSeasonIdEq AND e.episodeId = @eEpisodeIdEq)",
    params: {
      sPublisherIdEq: args.sPublisherIdEq == null ? null : args.sPublisherIdEq,
      eSeasonIdEq: args.eSeasonIdEq,
      eEpisodeIdEq: args.eEpisodeIdEq,
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
      sSeasonId: row.at(0).value == null ? undefined : row.at(0).value,
      sPublisherId: row.at(1).value == null ? undefined : row.at(1).value,
      sState: row.at(2).value == null ? undefined : toEnumFromNumber(row.at(2).value.value, SEASON_STATE),
      sName: row.at(3).value == null ? undefined : row.at(3).value,
      sCoverImageR2Filename: row.at(4).value == null ? undefined : row.at(4).value,
      sTotalEpisodes: row.at(5).value == null ? undefined : row.at(5).value.value,
      sLastChangeTimeMs: row.at(6).value == null ? undefined : row.at(6).value.value,
      sRecentPremierTimeMs: row.at(7).value == null ? undefined : row.at(7).value.value,
      eSeasonId: row.at(8).value == null ? undefined : row.at(8).value,
      eEpisodeId: row.at(9).value == null ? undefined : row.at(9).value,
      eIndex: row.at(10).value == null ? undefined : row.at(10).value.value,
      eName: row.at(11).value == null ? undefined : row.at(11).value,
      eVideoContainerId: row.at(12).value == null ? undefined : row.at(12).value,
      eVideoContainer: row.at(13).value == null ? undefined : deserializeMessage(row.at(13).value, VIDEO_CONTAINER),
      ePremierTimeMs: row.at(14).value == null ? undefined : row.at(14).value.value,
      ePublishTimeMs: row.at(15).value == null ? undefined : row.at(15).value.value,
    });
  }
  return resRows;
}
