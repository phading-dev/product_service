import { toTodaISOString } from "../../../common/date_helper";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getLastSeasonGrades,
  getPublishedSeasonAndEpisodeForConsumer,
} from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { GetSeasonAndEpisodeSummaryHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  GetSeasonAndEpisodeSummaryRequestBody,
  GetSeasonAndEpisodeSummaryResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newInternalServerErrorError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class GetSeasonAndEpisodeSummaryHandler extends GetSeasonAndEpisodeSummaryHandlerInterface {
  public static create(): GetSeasonAndEpisodeSummaryHandler {
    return new GetSeasonAndEpisodeSummaryHandler(
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
    body: GetSeasonAndEpisodeSummaryRequestBody,
    authStr: string,
  ): Promise<GetSeasonAndEpisodeSummaryResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.episodeId) {
      throw newBadRequestError(`"episodeId" is required.`);
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
        `Account ${accountId} not allowed to get season and episode summary.`,
      );
    }
    let todayStr = toTodaISOString(this.getNowDate());
    let [summaryRows, gradeRows] = await Promise.all([
      getPublishedSeasonAndEpisodeForConsumer(this.database, {
        seasonSeasonIdEq: body.seasonId,
        seasonStateEq: SeasonState.PUBLISHED,
        episodeEpisodeIdEq: body.episodeId,
        episodeStateEq: EpisodeState.PUBLISHED,
      }),
      getLastSeasonGrades(this.database, {
        seasonGradeSeasonIdEq: body.seasonId,
        seasonGradeEndDateGt: todayStr,
        limit: 1,
      }),
    ]);
    if (summaryRows.length === 0) {
      throw newNotFoundError(
        `Season ${body.seasonId} or episode ${body.episodeId} is not found.`,
      );
    }
    if (gradeRows.length === 0) {
      throw newInternalServerErrorError(
        `Season ${body.seasonId} has no grade at today ${todayStr}.`,
      );
    }
    return {
      summary: {
        season: {
          seasonId: summaryRows[0].seasonSeasonId,
          publisherId: summaryRows[0].seasonPublisherId,
          name: summaryRows[0].seasonName,
          coverImageUrl: `${this.coverImagePublicAccessDomain}/${summaryRows[0].seasonCoverImageR2Filename}`,
          grade: gradeRows[0].seasonGradeGrade,
          totalEpisodes: summaryRows[0].seasonTotalEpisodes,
          averageRating: summaryRows[0].seasonAverageRating,
          ratingsCount: summaryRows[0].seasonRatingsCount,
        },
        episode: {
          episodeId: summaryRows[0].episodeEpisodeId,
          index: summaryRows[0].episodeIndex,
          name: summaryRows[0].episodeName,
          videoDurationSec: summaryRows[0].episodeVideoContainer.durationSec,
          premiereTimeMs: summaryRows[0].episodePremiereTimeMs,
        },
      },
    };
  }
}
