import {
  ContinuedSearchPublishedSeasonsRow,
  ListPublishedSeasonsByPremiereTimeAndPublisherRow,
  ListPublishedSeasonsByPremiereTimeRow,
  ListPublishedSeasonsByRatingAndPublisherRow,
  ListPublishedSeasonsByRatingRow,
  SearchPublishedSeasonsRow,
  getSeasonGrade,
} from "../../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { SeasonSummary } from "@phading/product_service_interface/show/web/consumer/info";
import { newInternalServerErrorError } from "@selfage/http_error";

export async function getCurrentSeasonGradeAndSummarizeSeason(
  database: Database,
  coverImagePublicAccessDomain: string,
  todayStr: string,
  row:
    | ListPublishedSeasonsByRatingRow
    | ListPublishedSeasonsByRatingAndPublisherRow
    | ListPublishedSeasonsByPremiereTimeRow
    | ListPublishedSeasonsByPremiereTimeAndPublisherRow
    | SearchPublishedSeasonsRow
    | ContinuedSearchPublishedSeasonsRow,
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
    publisherId: row.seasonPublisherId,
    name: row.seasonName,
    coverImageUrl: row.seasonCoverImageR2Filename
      ? `${coverImagePublicAccessDomain}/${row.seasonCoverImageR2Filename}`
      : undefined,
    grade: gradeRows[0].seasonGradeGrade,
    totalEpisodes: row.seasonTotalPublishedEpisodes,
    averageRating: row.seasonAverageRating,
    ratingsCount: row.seasonRatingsCount,
  };
}
