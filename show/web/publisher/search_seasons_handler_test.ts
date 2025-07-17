import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertSeasonGradeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { SearchSeasonsHandler } from "./search_seasons_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { SEARCH_SEASONS_RESPONSE } from "@phading/product_service_interface/show/web/publisher/interface";
import { SEASON_SUMMARY } from "@phading/product_service_interface/show/web/publisher/summary";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat, eq, gt } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "SearchSeasonsHandlerTest",
  cases: [
    {
      name: "SearchOnce_SearchAgainButNoMore",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.DRAFT,
              name: "Thrilling Eclipse",
              description:
                "An engaging journey of discovering lyrics. A tale of friendship and growth. Filled with surprises and excitement.",
              totalPublishedEpisodes: 1,
              lastChangeTimeMs: 1000,
              ratingsCount: 0,
              averageRating: 0,
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
              seasonId: "season2",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              name: "Happy sand",
              description: "A sand in a desert.",
              coverImageR2Filename: "cover2",
              totalPublishedEpisodes: 1,
              lastChangeTimeMs: 2000,
              ratingsCount: 0,
              averageRating: 0,
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
              seasonId: "season3",
              publisherId: "publisher1",
              state: SeasonState.ARCHIVED,
              name: "Thrilling Eclipse",
              description:
                "An engaging journey of discovering lyrics. A tale of friendship and growth. Filled with surprises and excitement.",
              coverImageR2Filename: "cover3",
              totalPublishedEpisodes: 1,
              lastChangeTimeMs: 3000,
              ratingsCount: 0,
              averageRating: 0,
              createdTimeMs: 2000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season3",
              gradeId: "grade3",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 33,
            }),
            insertSeasonStatement({
              seasonId: "season4",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              name: "Thrilling Eclipse Lyrics",
              description:
                "Epic season with thrilling narratives. A heartwarming tale of courage and growth. Packed with twists, turns, and surprises.",
              coverImageR2Filename: "cover4",
              totalPublishedEpisodes: 1,
              lastChangeTimeMs: 4000,
              ratingsCount: 0,
              averageRating: 0,
              createdTimeMs: 2000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season4",
              gradeId: "grade4",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 44,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublish: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new SearchSeasonsHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          "https://test.com",
          () => new Date("2023-10-23"),
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            query: "Thrilling Eclipse Lyrics",
            limit: 2,
          },
          "session1",
        );

        // Verify
        assertThat(response.seasons.length, eq(2), "response seasons length");
        assertThat(
          response.seasons[0],
          eqMessage(
            {
              seasonId: "season4",
              name: "Thrilling Eclipse Lyrics",
              coverImageUrl: "https://test.com/cover4",
              totalPublishedEpisodes: 1,
              state: SeasonState.PUBLISHED,
              lastChangeTimeMs: 4000,
              ratingsCount: 0,
              averageRating: 0,
              grade: 44,
            },
            SEASON_SUMMARY,
          ),
          "response 1 first season",
        );
        assertThat(
          response.seasons[1],
          eqMessage(
            {
              seasonId: "season1",
              name: "Thrilling Eclipse",
              totalPublishedEpisodes: 1,
              state: SeasonState.DRAFT,
              lastChangeTimeMs: 1000,
              ratingsCount: 0,
              averageRating: 0,
              grade: 11,
            },
            SEASON_SUMMARY,
          ),
          "response 1 second season",
        );
        assertThat(response.scoreCursor, gt(0), "response 1 score cursor");
        assertThat(
          response.createdTimeCursor,
          eq(1000),
          "response 1 created time cursor",
        );

        // Execute
        response = await handler.handle(
          "",
          {
            query: "Thrilling Eclipse Lyrics",
            limit: 2,
            scoreCursor: response.scoreCursor,
            createdTimeCursor: response.createdTimeCursor,
          },
          "session1",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              seasons: [
                {
                  seasonId: "season3",
                  name: "Thrilling Eclipse",
                  coverImageUrl: "https://test.com/cover3",
                  totalPublishedEpisodes: 1,
                  state: SeasonState.ARCHIVED,
                  lastChangeTimeMs: 3000,
                  ratingsCount: 0,
                  averageRating: 0,
                  grade: 33,
                },
              ],
            },
            SEARCH_SEASONS_RESPONSE,
          ),
          "response 2",
        );
      },
      async tearDown() {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
            deleteSeasonStatement({ seasonSeasonIdEq: "season2" }),
            deleteSeasonStatement({ seasonSeasonIdEq: "season3" }),
            deleteSeasonStatement({ seasonSeasonIdEq: "season4" }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "SearchByStateOnce",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.DRAFT,
              name: "Thrilling Eclipse",
              description:
                "An engaging journey of discovering lyrics. A tale of friendship and growth. Filled with surprises and excitement.",
              totalPublishedEpisodes: 1,
              lastChangeTimeMs: 1000,
              ratingsCount: 0,
              averageRating: 0,
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
              seasonId: "season2",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              name: "Happy sand",
              description: "A sand in a desert.",
              coverImageR2Filename: "cover2",
              totalPublishedEpisodes: 1,
              lastChangeTimeMs: 2000,
              ratingsCount: 0,
              averageRating: 0,
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
              seasonId: "season3",
              publisherId: "publisher1",
              state: SeasonState.ARCHIVED,
              name: "Thrilling Eclipse",
              description:
                "An engaging journey of discovering lyrics. A tale of friendship and growth. Filled with surprises and excitement.",
              coverImageR2Filename: "cover3",
              totalPublishedEpisodes: 1,
              lastChangeTimeMs: 3000,
              ratingsCount: 0,
              averageRating: 0,
              createdTimeMs: 2000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season3",
              gradeId: "grade3",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 33,
            }),
            insertSeasonStatement({
              seasonId: "season4",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              name: "Thrilling Eclipse Lyrics",
              description:
                "Epic season with thrilling narratives. A heartwarming tale of courage and growth. Packed with twists, turns, and surprises.",
              coverImageR2Filename: "cover4",
              totalPublishedEpisodes: 1,
              lastChangeTimeMs: 4000,
              ratingsCount: 0,
              averageRating: 0,
              createdTimeMs: 2000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season4",
              gradeId: "grade4",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 44,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublish: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new SearchSeasonsHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          "https://test.com",
          () => new Date("2023-10-23"),
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            state: SeasonState.PUBLISHED,
            query: "Thrilling Eclipse Lyrics",
            limit: 2,
          },
          "session1",
        );

        // Verify
        assertThat(response.seasons.length, eq(1), "response seasons length");
        assertThat(
          response.seasons[0],
          eqMessage(
            {
              seasonId: "season4",
              name: "Thrilling Eclipse Lyrics",
              coverImageUrl: "https://test.com/cover4",
              totalPublishedEpisodes: 1,
              state: SeasonState.PUBLISHED,
              lastChangeTimeMs: 4000,
              ratingsCount: 0,
              averageRating: 0,
              grade: 44,
            },
            SEASON_SUMMARY,
          ),
          "response 1 first season",
        );
        assertThat(response.scoreCursor, gt(0), "response 1 score cursor");
        assertThat(
          response.createdTimeCursor,
          eq(1000),
          "response 1 created time cursor",
        );
      },
      async tearDown() {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
            deleteSeasonStatement({ seasonSeasonIdEq: "season2" }),
            deleteSeasonStatement({ seasonSeasonIdEq: "season3" }),
            deleteSeasonStatement({ seasonSeasonIdEq: "season4" }),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
