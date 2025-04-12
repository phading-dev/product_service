import {
  ContinuedSearchPublishedSeasonsForConsumerRow,
  ListPublishedSeasonsByPremierTimeForConsumerRow,
  ListPublishedSeasonsByRatingForConsumerRow,
  SearchPublishedSeasonsForConsumerRow,
  getLastSeasonGrades,
} from "../../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { SeasonSummary } from "@phading/product_service_interface/show/web/consumer/summary";
import { newInternalServerErrorError } from "@selfage/http_error";

export async function getLatestSeasonGradeAndSummarizeSeason(
  database: Database,
  coverImagePublicAccessDomain: string,
  todayStr: string,
  row:
    | ListPublishedSeasonsByRatingForConsumerRow
    | ListPublishedSeasonsByPremierTimeForConsumerRow
    | SearchPublishedSeasonsForConsumerRow
    | ContinuedSearchPublishedSeasonsForConsumerRow,
  i: number,
  seasons: Array<SeasonSummary>,
): Promise<void> {
  let gradeRows = await getLastSeasonGrades(database, {
    seasonGradeSeasonIdEq: row.seasonSeasonId,
    seasonGradeEndDateGt: todayStr,
    limit: 1,
  });
  if (gradeRows.length === 0) {
    throw newInternalServerErrorError(
      `Season ${row.seasonSeasonId} has no grade at today ${todayStr}.`,
    );
  }
  seasons[i] = {
    seasonId: row.seasonSeasonId,
    publisherId: row.seasonPublisherId,
    name: row.seasonName,
    coverImageUrl: `${coverImagePublicAccessDomain}/${row.seasonCoverImageR2Filename}`,
    totalEpisodes: row.seasonTotalEpisodes,
    averageRating: row.seasonAverageRating,
    grade: gradeRows[0].seasonGradeGrade,
  };
}
