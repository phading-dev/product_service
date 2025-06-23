import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertSeasonGradeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { ListSeasonsByRecentPremiereTimeHandler } from "./list_seasons_by_recent_premiere_time_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { LIST_SEASONS_BY_RECENT_PREMIERE_TIME_RESPONSE } from "@phading/product_service_interface/show/web/consumer/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "ListSeasonsByRecentPremiereTimeHandlerTest",
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
              ratingsCount: 2,
              averageRating: 4.5,
              recentPremiereTimeMs: 20,
              createdTimeMs: 10,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 5,
            }),
            insertSeasonStatement({
              seasonId: "season4",
              publisherId: "publisher4",
              state: SeasonState.PUBLISHED,
              name: "name4",
              coverImageR2Filename: "cover4",
              totalPublishedEpisodes: 24,
              ratingsCount: 4,
              averageRating: 3.5,
              recentPremiereTimeMs: 40,
              createdTimeMs: 10,
            }),
            insertSeasonGradeStatement({
              seasonId: "season4",
              gradeId: "grade4",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 10,
            }),
            insertSeasonStatement({
              seasonId: "season3",
              publisherId: "publisher3",
              state: SeasonState.ARCHIVED,
              name: "name3",
              coverImageR2Filename: "cover3",
              totalPublishedEpisodes: 23,
              ratingsCount: 1,
              averageRating: 3,
              recentPremiereTimeMs: 30,
              createdTimeMs: 10,
            }),
            insertSeasonGradeStatement({
              seasonId: "season3",
              gradeId: "grade3",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 20,
            }),
            insertSeasonStatement({
              seasonId: "season2",
              publisherId: "publisher2",
              state: SeasonState.PUBLISHED,
              name: "name2",
              coverImageR2Filename: "cover2",
              totalPublishedEpisodes: 22,
              ratingsCount: 0,
              averageRating: 0,
              recentPremiereTimeMs: 20,
              createdTimeMs: 20,
            }),
            insertSeasonGradeStatement({
              seasonId: "season2",
              gradeId: "grade2",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 40,
            }),
          ]);
          await transaction.commit();
        });
        let handler = new ListSeasonsByRecentPremiereTimeHandler(
          SPANNER_DATABASE,
          "https://test.com",
          () => new Date("2023-10-23"),
        );

        {
          // Execute
          let response = await handler.handle("", { limit: 2 });

          // Verify
          assertThat(
            response,
            eqMessage(
              {
                seasons: [
                  {
                    seasonId: "season4",
                    publisherId: "publisher4",
                    name: "name4",
                    coverImageUrl: "https://test.com/cover4",
                    grade: 10,
                    totalEpisodes: 24,
                    ratingsCount: 4,
                    averageRating: 3.5,
                  },
                  {
                    seasonId: "season2",
                    publisherId: "publisher2",
                    name: "name2",
                    coverImageUrl: "https://test.com/cover2",
                    grade: 40,
                    totalEpisodes: 22,
                    ratingsCount: 0,
                    averageRating: 0,
                  },
                ],
                premiereTimeCursor: 20,
                createdTimeCursor: 20,
              },
              LIST_SEASONS_BY_RECENT_PREMIERE_TIME_RESPONSE,
            ),
            "response 1",
          );
        }

        {
          // Execute
          let response = await handler.handle("", {
            premiereTimeCursor: 20,
            createdTimeCursor: 20,
            limit: 2,
          });

          // Verify
          assertThat(
            response,
            eqMessage(
              {
                seasons: [
                  {
                    seasonId: "season1",
                    publisherId: "publisher1",
                    name: "name1",
                    coverImageUrl: "https://test.com/cover1",
                    grade: 5,
                    totalEpisodes: 21,
                    ratingsCount: 2,
                    averageRating: 4.5,
                  },
                ],
              },
              LIST_SEASONS_BY_RECENT_PREMIERE_TIME_RESPONSE,
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
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
