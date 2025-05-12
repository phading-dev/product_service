import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getLastSeasonGrades,
  getPublishedSeasonAndEpisode,
} from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { GetEpisodeWithSeasonSummaryHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  GetEpisodeWithSeasonSummaryRequestBody,
  GetEpisodeWithSeasonSummaryResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import {
  newBadRequestError,
  newInternalServerErrorError,
  newNotFoundError,
} from "@selfage/http_error";
import { TzDate } from "@selfage/tz_date";

export class GetEpisodeWithSeasonSummaryHandler extends GetEpisodeWithSeasonSummaryHandlerInterface {
  public static create(): GetEpisodeWithSeasonSummaryHandler {
    return new GetEpisodeWithSeasonSummaryHandler(
      SPANNER_DATABASE,
      ENV_VARS.r2SeasonCoverImagePublicAccessDomain,
      () => new Date(),
    );
  }

  public constructor(
    private database: Database,
    private coverImagePublicAccessDomain: string,
    private getNowDate: () => Date,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: GetEpisodeWithSeasonSummaryRequestBody,
  ): Promise<GetEpisodeWithSeasonSummaryResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.episodeId) {
      throw newBadRequestError(`"episodeId" is required.`);
    }
    let todayStr = TzDate.fromNewDate(
      this.getNowDate(),
      ENV_VARS.timezoneNegativeOffset,
    ).toLocalDateISOString();
    let [summaryRows, gradeRows] = await Promise.all([
      getPublishedSeasonAndEpisode(this.database, {
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
        `Season ${body.seasonId} does not have any grade on today ${todayStr}.`,
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
          averageRating: summaryRows[0].seasonAverageRating,
          ratingsCount: summaryRows[0].seasonRatingsCount,
        },
        episode: {
          episodeId: summaryRows[0].episodeEpisodeId,
          index: summaryRows[0].episodeIndex,
          name: summaryRows[0].episodeName,
          videoDurationSec: summaryRows[0].episodeVideoContainer.durationSec,
          resolution: summaryRows[0].episodeVideoContainer.resolution,
          premiereTimeMs: summaryRows[0].episodePremiereTimeMs,
        },
      },
    };
  }
}
