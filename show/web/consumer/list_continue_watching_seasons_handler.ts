import {
  MAX_LIST_SEASONS_ITEMS,
  NEXT_EPISODE_WATCH_TIME_THRESHOLD,
} from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getLastSeasonGrades,
  getPublishedEpisode,
  getPublishedSeason,
  listNextPublishedEpisodes,
} from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { newListRecentlyWatchedSeasonsRequest } from "@phading/play_activity_service_interface/show/node/client";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { ListContinueWatchingSeasonsHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  ContinueSeason,
  Episode,
  SeasonSummary,
} from "@phading/product_service_interface/show/web/consumer/info";
import {
  ListContinueWatchingSeasonsRequestBody,
  ListContinueWatchingSeasonsResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newInternalServerErrorError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";
import { TzDate } from "@selfage/tz_date";

export class ListContinueWatchingSeasonsHandler extends ListContinueWatchingSeasonsHandlerInterface {
  public static create(): ListContinueWatchingSeasonsHandler {
    return new ListContinueWatchingSeasonsHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      ENV_VARS.r2SeasonCoverImagePublicAccessDomain,
      () => new Date(),
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private coverImagePublicAccessDomain: string,
    private getNowDate: () => Date,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: ListContinueWatchingSeasonsRequestBody,
    authStr: string,
  ): Promise<ListContinueWatchingSeasonsResponse> {
    if (!body.limit) {
      throw newBadRequestError(`"limit" is required.`);
    }
    if (body.limit > MAX_LIST_SEASONS_ITEMS) {
      throw newBadRequestError(`"limit" is too large.`);
    }
    let { accountId, capabilities } = await this.serviceClient.send(
      newFetchSessionAndCheckCapabilityRequest({
        signedSession: authStr,
        capabilitiesMask: {
          checkCanConsume: true,
        },
      }),
    );
    if (!capabilities.canConsume) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to list continue wathcing seasons.`,
      );
    }
    let response = await this.serviceClient.send(
      newListRecentlyWatchedSeasonsRequest({
        watcherId: accountId,
        limit: body.limit,
      }),
    );
    let todayStr = TzDate.fromNewDate(
      this.getNowDate(),
      ENV_VARS.timezoneNegativeOffset,
    ).toLocalDateISOString();
    let continues = new Array<ContinueSeason>(response.seasons.length);
    await Promise.all(
      response.seasons.map(async (recentSeason, i) => {
        let seasonRowsPromise = getPublishedSeason(this.database, {
          seasonSeasonIdEq: recentSeason.seasonId,
          seasonStateEq: SeasonState.PUBLISHED,
        });
        let seasonGradeRowsPromise = getLastSeasonGrades(this.database, {
          seasonGradeSeasonIdEq: recentSeason.seasonId,
          seasonGradeEndDateGt: todayStr,
          limit: 1,
        });
        let getContinueEpisodePromise = this.getContinueEpisode(
          recentSeason.seasonId,
          recentSeason.latestEpisodeId,
          recentSeason.latestWatchedVideoTimeMs,
        );
        let seasonRows = await seasonRowsPromise;
        if (seasonRows.length === 0) {
          return;
        }
        let seasonRow = seasonRows[0];
        let seasonGradeRows = await seasonGradeRowsPromise;
        if (seasonGradeRows.length === 0) {
          throw newInternalServerErrorError(
            `Season ${recentSeason.seasonId} does not have any grades on today ${todayStr}.`,
          );
        }
        let seasonGradeRow = seasonGradeRows[0];
        let continueEpisode = await getContinueEpisodePromise;
        if (!continueEpisode) {
          return;
        }
        let seasonSummary: SeasonSummary = {
          seasonId: seasonRow.seasonSeasonId,
          name: seasonRow.seasonName,
          publisherId: seasonRow.seasonPublisherId,
          coverImageUrl: `${this.coverImagePublicAccessDomain}/${seasonRow.seasonCoverImageR2Filename}`,
          grade: seasonGradeRow.seasonGradeGrade,
          totalEpisodes: seasonRow.seasonTotalPublishedEpisodes,
          averageRating: seasonRow.seasonAverageRating,
          ratingsCount: seasonRow.seasonRatingsCount,
        };
        continues[i] = {
          season: seasonSummary,
          episode: continueEpisode.episode,
          continueTimeMs: continueEpisode.continueTimeMs,
        };
      }),
    );
    return {
      continues: continues.filter((c) => c),
    };
  }

  private async getContinueEpisode(
    seasonId: string,
    latestEpisodeId: string,
    latestWatchedVideoTimeMs: number,
  ): Promise<{
    episode: Episode;
    continueTimeMs: number;
  }> {
    let latestEpisodeRows = await getPublishedEpisode(this.database, {
      episodeSeasonIdEq: seasonId,
      seasonStateEq: SeasonState.PUBLISHED,
      episodeEpisodeIdEq: latestEpisodeId,
      episodeStateEq: EpisodeState.PUBLISHED,
    });
    if (latestEpisodeRows.length === 0) {
      return undefined;
    }
    let latestEpisode = latestEpisodeRows[0];
    if (
      latestWatchedVideoTimeMs <
      latestEpisode.episodeVideoContainer.durationSec *
        1000 *
        NEXT_EPISODE_WATCH_TIME_THRESHOLD
    ) {
      return {
        episode: {
          episodeId: latestEpisode.episodeEpisodeId,
          name: latestEpisode.episodeName,
          index: latestEpisode.episodeIndex,
          videoDurationSec: latestEpisode.episodeVideoContainer.durationSec,
          resolution: latestEpisode.episodeVideoContainer.resolution,
          premiereTimeMs: latestEpisode.episodePremiereTimeMs,
        },
        continueTimeMs: latestWatchedVideoTimeMs,
      };
    }

    let nextEpisodeRows = await listNextPublishedEpisodes(this.database, {
      episodeSeasonIdEq: seasonId,
      seasonStateEq: SeasonState.PUBLISHED,
      episodeIndexGt: latestEpisode.episodeIndex,
      episodeStateEq: EpisodeState.PUBLISHED,
      limit: 1,
    });
    if (nextEpisodeRows.length === 0) {
      return undefined;
    }
    let nextEpisode = nextEpisodeRows[0];
    return {
      episode: {
        episodeId: nextEpisode.episodeEpisodeId,
        name: nextEpisode.episodeName,
        index: nextEpisode.episodeIndex,
        videoDurationSec: nextEpisode.episodeVideoContainer.durationSec,
        resolution: nextEpisode.episodeVideoContainer.resolution,
        premiereTimeMs: nextEpisode.episodePremiereTimeMs,
      },
      continueTimeMs: 0,
    };
  }
}
