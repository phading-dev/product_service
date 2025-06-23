import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertSeasonGradeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { ListSeasonsByRatingAndPublisherHandler } from "./list_seasons_by_rating_and_publisher_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { LIST_SEASONS_BY_RATING_RESPONSE } from "@phading/product_service_interface/show/web/consumer/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "ListSeasonsByRatingAndPublisherHandlerTest",
  cases: [
    {
      name: "ListOneBatch_ListAgainButNoMore",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              name: "name1",
              coverImageR2Filename: "cover1",
              totalPublishedEpisodes: 21,
              ratingsCount: 1,
              averageRating: 5,
              createdTimeMs: 1000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 11,
            }),
            insertSeasonStatement({
              seasonId: "season4",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              name: "name4",
              coverImageR2Filename: "cover4",
              totalPublishedEpisodes: 24,
              ratingsCount: 4,
              averageRating: 5,
              createdTimeMs: 2000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season4",
              gradeId: "grade4",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 44,
            }),
            insertSeasonStatement({
              seasonId: "season3",
              publisherId: "publisher1",
              state: SeasonState.ARCHIVED,
              name: "name3",
              coverImageR2Filename: "cover3",
              totalPublishedEpisodes: 23,
              ratingsCount: 3,
              averageRating: 3,
              createdTimeMs: 3000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season3",
              gradeId: "grade3",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 33,
            }),
            insertSeasonStatement({
              seasonId: "season2",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              name: "name2",
              coverImageR2Filename: "cover2",
              totalPublishedEpisodes: 22,
              ratingsCount: 2,
              averageRating: 3,
              createdTimeMs: 1000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season2",
              gradeId: "grade2",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 22,
            }),
            insertSeasonStatement({
              seasonId: "season5",
              publisherId: "publisher2",
              state: SeasonState.PUBLISHED,
              name: "name5",
              coverImageR2Filename: "cover5",
              totalPublishedEpisodes: 25,
              ratingsCount: 5,
              averageRating: 4,
              createdTimeMs: 1000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season5",
              gradeId: "grade5",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 55,
            }),
          ]);
          await transaction.commit();
        });
        let handler = new ListSeasonsByRatingAndPublisherHandler(
          SPANNER_DATABASE,
          "https://test.com",
          () => new Date("2023-10-23"),
        );

        {
          // Execute
          let response = await handler.handle("", {
            publisherId: "publisher1",
            limit: 2,
          });

          // Verify
          assertThat(
            response,
            eqMessage(
              {
                seasons: [
                  {
                    seasonId: "season4",
                    publisherId: "publisher1",
                    name: "name4",
                    coverImageUrl: "https://test.com/cover4",
                    grade: 44,
                    totalEpisodes: 24,
                    ratingsCount: 4,
                    averageRating: 5,
                  },
                  {
                    seasonId: "season1",
                    publisherId: "publisher1",
                    name: "name1",
                    coverImageUrl: "https://test.com/cover1",
                    grade: 11,
                    totalEpisodes: 21,
                    ratingsCount: 1,
                    averageRating: 5,
                  },
                ],
                ratingCursor: 5,
                createdTimeCursor: 1000,
              },
              LIST_SEASONS_BY_RATING_RESPONSE,
            ),
            "response 1",
          );
        }

        {
          // Execute
          let response = await handler.handle("", {
            publisherId: "publisher1",
            ratingCursor: 5,
            createdTimeCursor: 1000,
            limit: 2,
          });

          // Verify
          assertThat(
            response,
            eqMessage(
              {
                seasons: [
                  {
                    seasonId: "season2",
                    publisherId: "publisher1",
                    name: "name2",
                    coverImageUrl: "https://test.com/cover2",
                    grade: 22,
                    totalEpisodes: 22,
                    ratingsCount: 2,
                    averageRating: 3,
                  },
                ],
              },
              LIST_SEASONS_BY_RATING_RESPONSE,
            ),
            "response 2",
          );
        }
      },
      async tearDown() {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({
              seasonSeasonIdEq: "season1",
            }),
            deleteSeasonStatement({
              seasonSeasonIdEq: "season2",
            }),
            deleteSeasonStatement({
              seasonSeasonIdEq: "season3",
            }),
            deleteSeasonStatement({
              seasonSeasonIdEq: "season4",
            }),
            deleteSeasonStatement({
              seasonSeasonIdEq: "season5",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
