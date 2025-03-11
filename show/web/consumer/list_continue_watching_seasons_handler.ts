import { MAX_LIST_SEASONS_ITEMS } from "../../../common/constants";
import { toTodaISOString } from "../../../common/date_helper";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getLastSeasonGrades,
  getPublishedSeasonAndRatingForConsumer,
} from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { fetchContinueEpisode } from "./common/continue_episode_fetcher";
import { Database } from "@google-cloud/spanner";
import { newListRecentlyWatchedSeasonsRequest } from "@phading/play_activity_service_interface/show/node/client";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { ListContinueWatchingSeasonsHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  ListContinueWatchingSeasonsRequestBody,
  ListContinueWatchingSeasonsResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import {
  ContinueSeason,
  SeasonSummary,
} from "@phading/product_service_interface/show/web/consumer/season_summary";
import { newExchangeSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newInternalServerErrorError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

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
      newExchangeSessionAndCheckCapabilityRequest({
        signedSession: authStr,
        capabilitiesMask: {
          checkCanConsumeShows: true,
        },
      }),
    );
    if (!capabilities.canConsumeShows) {
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
    let nowDate = this.getNowDate();
    let now = nowDate.valueOf();
    let todayStr = toTodaISOString(nowDate);
    let continues = new Array<ContinueSeason>(response.seasons.length);
    await Promise.all(
      response.seasons.map(async (recentSeason, i) => {
        let seasonRowsPromise = getPublishedSeasonAndRatingForConsumer(
          this.database,
          recentSeason.seasonId,
          SeasonState.PUBLISHED,
        );
        let seasonGradeRowsPromise = getLastSeasonGrades(
          this.database,
          recentSeason.seasonId,
          todayStr,
          1,
        );
        let fetchContinueEpisodePromise = fetchContinueEpisode(
          this.database,
          recentSeason.seasonId,
          recentSeason.latestEpisodeId,
          recentSeason.latestEpisodeIndex,
          recentSeason.latestWatchedTimeMs,
          now,
        );
        let [seasonRows, seasonGradeRows] = await Promise.all([
          seasonRowsPromise,
          seasonGradeRowsPromise,
        ]);
        if (seasonRows.length === 0) {
          return;
        }
        if (seasonGradeRows.length === 0) {
          throw newInternalServerErrorError(
            `Season ${recentSeason.seasonId} today ${todayStr} has no grade.`,
          );
        }
        let seasonData = seasonRows[0].sData;
        let ratingData = seasonRows[0].srData;
        let gradeData = seasonGradeRows[0].seasonGradeData;
        let seasonSummary: SeasonSummary = {
          seasonId: seasonData.seasonId,
          name: seasonData.name,
          publisherId: seasonData.publisherId,
          totalEpisodes: seasonData.totalEpisodes,
          coverImageUrl: `${this.coverImagePublicAccessDomain}/${seasonData.coverImageR2Filename}`,
          grade: gradeData.grade,
          averageRating: ratingData ? ratingData.averageRating : 0,
        };
        let continueEpisode = await fetchContinueEpisodePromise;
        if (!continueEpisode) {
          return;
        }
        continues[i] = {
          season: seasonSummary,
          episode: continueEpisode,
        };
      }),
    );
    return {
      continues: continues.filter((c) => c),
    };
  }
}
