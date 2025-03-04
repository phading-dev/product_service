import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';
import { SeasonState, SEASON_STATE } from '@phading/product_service_interface/show/season_state';
import { VideoContainer, VIDEO_CONTAINER } from '@phading/product_service_interface/show/video_container';

export interface Season {
  seasonId?: string,
  publisherId?: string,
  state?: SeasonState,
  name?: string,
  coverImageR2Filename?: string,
  totalEpisodes?: number,
  lastChangeTimeMs?: number,
}

export let SEASON: MessageDescriptor<Season> = {
  name: 'Season',
  fields: [{
    name: 'seasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'publisherId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'state',
    index: 3,
    enumType: SEASON_STATE,
  }, {
    name: 'name',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'coverImageR2Filename',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'totalEpisodes',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'lastChangeTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export interface SeasonMore {
  seasonId?: string,
  description?: string,
  createdTimeMs?: number,
}

export let SEASON_MORE: MessageDescriptor<SeasonMore> = {
  name: 'SeasonMore',
  fields: [{
    name: 'seasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'description',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'createdTimeMs',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export interface SeasonGrade {
  seasonId?: string,
  gradeId?: string,
  startDate?: string,
  endDate?: string,
  grade?: number,
}

export let SEASON_GRADE: MessageDescriptor<SeasonGrade> = {
  name: 'SeasonGrade',
  fields: [{
    name: 'seasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'gradeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'startDate',
    index: 3,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'endDate',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'grade',
    index: 5,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export interface Episode {
  seasonId?: string,
  episodeId?: string,
  index?: number,
  name?: string,
  videoContainerId?: string,
  videoContainer?: VideoContainer,
  premierTimeMs?: number,
  publishTimeMs?: number,
}

export let EPISODE: MessageDescriptor<Episode> = {
  name: 'Episode',
  fields: [{
    name: 'seasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'episodeId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'index',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'name',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'videoContainerId',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'videoContainer',
    index: 6,
    messageType: VIDEO_CONTAINER,
  }, {
    name: 'premierTimeMs',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'publishTimeMs',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export interface IndividualSeasonRating {
  raterId?: string,
  seasonId?: string,
  rating?: number,
  ratedTimeMs?: number,
}

export let INDIVIDUAL_SEASON_RATING: MessageDescriptor<IndividualSeasonRating> = {
  name: 'IndividualSeasonRating',
  fields: [{
    name: 'raterId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'seasonId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'rating',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'ratedTimeMs',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export interface SeasonRating {
  seasonId?: string,
  totalRatings?: number,
  count?: number,
  updatedTimeMs?: number,
}

export let SEASON_RATING: MessageDescriptor<SeasonRating> = {
  name: 'SeasonRating',
  fields: [{
    name: 'seasonId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'totalRatings',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'count',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'updatedTimeMs',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }],
};
