import {
  ListSeasonsForPublisherRow,
  SearchSeasonsForPublisherRow,
  getSeasonGrade,
} from "../../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { SeasonSummary } from "@phading/product_service_interface/show/web/publisher/summary";
import { newInternalServerErrorError } from "@selfage/http_error";

export async function getCurrentSeasonGradeAndSummarizeSeason(
  database: Database,
  coverImagePublicAccessDomain: string,
  todayStr: string,
  row: ListSeasonsForPublisherRow | SearchSeasonsForPublisherRow,
  i: number,
  seasons: Array<SeasonSummary>,
): Promise<void> {
  let gradeRows = await getSeasonGrade(database, {
    seasonGradeSeasonIdEq: row.seasonSeasonId,
    seasonGradeStartDateLe: todayStr,
    seasonGradeEndDateGt: todayStr,
  });
  if (gradeRows.length === 0) {
    throw newInternalServerErrorError(
      `Season ${row.seasonSeasonId} does not have any grades on today ${todayStr}.`,
    );
  }
  seasons[i] = {
    seasonId: row.seasonSeasonId,
    name: row.seasonName,
    coverImageUrl: row.seasonCoverImageR2Filename
      ? `${coverImagePublicAccessDomain}/${row.seasonCoverImageR2Filename}`
      : undefined,
    totalPublishedEpisodes: row.seasonTotalPublishedEpisodes,
    lastChangeTimeMs: row.seasonLastChangeTimeMs,
    ratingsCount: row.seasonRatingsCount,
    averageRating: row.seasonAverageRating,
    grade: gradeRows[0].seasonGradeGrade,
  };
}
