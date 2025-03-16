import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertSeasonGradeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { ListSeasonsByRatingHandler } from "./list_seasons_by_rating_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { LIST_SEASONS_BY_RATING_RESPONSE } from "@phading/product_service_interface/show/web/consumer/interface";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "ListSeasonsByRatingHandlerTest",
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
              totalEpisodes: 1,
              averageRating: 5,
              ratingUpdatedTimeMs: 1000,
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
              publisherId: "publisher4",
              state: SeasonState.PUBLISHED,
              name: "name4",
              coverImageR2Filename: "cover4",
              totalEpisodes: 4,
              averageRating: 5,
              ratingUpdatedTimeMs: 2000,
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
              publisherId: "publisher3",
              state: SeasonState.ARCHIVED,
              name: "name3",
              coverImageR2Filename: "cover3",
              totalEpisodes: 3,
              averageRating: 3,
              ratingUpdatedTimeMs: 3000,
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
              publisherId: "publisher2",
              state: SeasonState.PUBLISHED,
              name: "name2",
              coverImageR2Filename: "cover2",
              totalEpisodes: 2,
              averageRating: 3,
              ratingUpdatedTimeMs: 1000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season2",
              gradeId: "grade2",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 22,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
          capabilities: {
            canConsume: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new ListSeasonsByRatingHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          "https://test.com",
          () => new Date(1000),
        );

        {
          // Execute
          let response = await handler.handle(
            "",
            {
              limit: 2,
            },
            "authStr",
          );

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
                    totalEpisodes: 4,
                    grade: 44,
                    averageRating: 5,
                  },
                  {
                    seasonId: "season1",
                    publisherId: "publisher1",
                    name: "name1",
                    coverImageUrl: "https://test.com/cover1",
                    totalEpisodes: 1,
                    grade: 11,
                    averageRating: 5,
                  },
                ],
                ratingCursor: 5,
                updatedTimeCursor: 1000,
              },
              LIST_SEASONS_BY_RATING_RESPONSE,
            ),
            "response 1",
          );
        }

        {
          // Execute
          let response = await handler.handle(
            "",
            {
              ratingCursor: 5,
              updatedTimeCursor: 1000,
              limit: 2,
            },
            "authStr",
          );

          // Verify
          assertThat(
            response,
            eqMessage(
              {
                seasons: [
                  {
                    seasonId: "season2",
                    publisherId: "publisher2",
                    name: "name2",
                    coverImageUrl: "https://test.com/cover2",
                    totalEpisodes: 2,
                    grade: 22,
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
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
