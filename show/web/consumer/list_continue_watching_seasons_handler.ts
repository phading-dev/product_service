import { MAX_LIST_SEASONS_ITEMS } from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getLastSeasonGrades,
  getPublishedSeasonForConsumer,
} from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { fetchContinueEpisode } from "./common/fetch_continue_episode";
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
} from "@phading/product_service_interface/show/web/consumer/summary";
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
    let todayStr = TzDate.fromDate(
      this.getNowDate(),
      ENV_VARS.timezoneNegativeOffset,
    ).toLocalDateISOString();
    let continues = new Array<ContinueSeason>(response.seasons.length);
    await Promise.all(
      response.seasons.map(async (recentSeason, i) => {
        let seasonRowsPromise = getPublishedSeasonForConsumer(this.database, {
          seasonSeasonIdEq: recentSeason.seasonId,
          seasonStateEq: SeasonState.PUBLISHED,
        });
        let seasonGradeRowsPromise = getLastSeasonGrades(this.database, {
          seasonGradeSeasonIdEq: recentSeason.seasonId,
          seasonGradeEndDateGt: todayStr,
          limit: 1,
        });
        let fetchContinueEpisodePromise = fetchContinueEpisode(
          this.database,
          recentSeason.seasonId,
          recentSeason.latestEpisodeId,
          recentSeason.latestEpisodeIndex,
          recentSeason.latestWatchedTimeMs,
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
        let seasonRow = seasonRows[0];
        let seasonGradeRow = seasonGradeRows[0];
        let seasonSummary: SeasonSummary = {
          seasonId: seasonRow.seasonSeasonId,
          name: seasonRow.seasonName,
          publisherId: seasonRow.seasonPublisherId,
          totalEpisodes: seasonRow.seasonTotalEpisodes,
          coverImageUrl: `${this.coverImagePublicAccessDomain}/${seasonRow.seasonCoverImageR2Filename}`,
          grade: seasonGradeRow.seasonGradeGrade,
          averageRating: seasonRow.seasonAverageRating,
          ratingsCount: seasonRow.seasonRatingsCount,
        };
        let continueEpisode = await fetchContinueEpisodePromise;
        if (!continueEpisode) {
          return;
        }
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
}
