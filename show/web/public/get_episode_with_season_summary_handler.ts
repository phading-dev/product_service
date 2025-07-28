import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { getPublishedSeasonAndEpisode, getSeasonGrade } from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { GetEpisodeWithSeasonSummaryHandlerInterface } from "@phading/product_service_interface/show/web/public/handler";
import {
  GetEpisodeWithSeasonSummaryRequestBody,
  GetEpisodeWithSeasonSummaryResponse,
} from "@phading/product_service_interface/show/web/public/interface";
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
      ENV_VARS.r2SeasonCoverImagePublicAccessOrigin,
      () => new Date(),
    );
  }

  public constructor(
    private database: Database,
    private coverImagePublicAccessOrigin: string,
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
      getSeasonGrade(this.database, {
        seasonGradeSeasonIdEq: body.seasonId,
        seasonGradeStartDateLe: todayStr,
        seasonGradeEndDateGt: todayStr,
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
    let summary = summaryRows[0];
    let grade = gradeRows[0];
    return {
      summary: {
        season: {
          seasonId: summary.seasonSeasonId,
          publisherId: summary.seasonPublisherId,
          name: summary.seasonName,
          coverImageUrl: summary.seasonCoverImageR2Filename
            ? `${this.coverImagePublicAccessOrigin}/${summary.seasonCoverImageR2Filename}`
            : undefined,
          grade: grade.seasonGradeGrade,
          totalEpisodes: summary.seasonTotalPublishedEpisodes,
          averageRating: summary.seasonAverageRating,
          ratingsCount: summary.seasonRatingsCount,
        },
        episode: {
          episodeId: summary.episodeEpisodeId,
          index: summary.episodeIndex,
          name: summary.episodeName,
          videoDurationSec: summary.episodeVideoContainerCached.durationSec,
          resolution: summary.episodeVideoContainerCached.resolution,
          premiereTimeMs: summary.episodePremiereTimeMs,
          canPlay: summary.episodePremiereTimeMs <= this.getNowDate().getTime(),
        },
      },
    };
  }
}
