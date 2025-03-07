import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonRatingStatement,
  deleteSeasonStatement,
  insertSeasonRatingStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { ListSeasonsByRecentPublishTimeHandler } from "./list_seasons_by_recent_publish_time_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { LIST_SEASONS_BY_RECENT_PUBLISH_TIME_RESPONSE } from "@phading/product_service_interface/show/web/consumer/interface";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "ListSeasonsByRecentPublishTimeHandlerTest",
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
              lastChangeTimeMs: 100,
              recentPublishTimeMs: 10,
            }),
            insertSeasonRatingStatement({
              seasonId: "season1",
              averageRating: 4.5,
              updatedTimeMs: 1000,
            }),
            insertSeasonStatement({
              seasonId: "season4",
              publisherId: "publisher4",
              state: SeasonState.PUBLISHED,
              name: "name4",
              coverImageR2Filename: "cover4",
              totalEpisodes: 4,
              lastChangeTimeMs: 400,
              recentPublishTimeMs: 40,
            }),
            insertSeasonRatingStatement({
              seasonId: "season4",
              averageRating: 3.5,
              updatedTimeMs: 1000,
            }),
            insertSeasonStatement({
              seasonId: "season3",
              publisherId: "publisher3",
              state: SeasonState.ARCHIVED,
              name: "name3",
              coverImageR2Filename: "cover3",
              totalEpisodes: 3,
              lastChangeTimeMs: 300,
              recentPublishTimeMs: 30,
            }),
            insertSeasonRatingStatement({
              seasonId: "season3",
              averageRating: 3,
              updatedTimeMs: 1000,
            }),
            insertSeasonStatement({
              seasonId: "season2",
              publisherId: "publisher2",
              state: SeasonState.PUBLISHED,
              name: "name2",
              coverImageR2Filename: "cover2",
              totalEpisodes: 2,
              lastChangeTimeMs: 200,
              recentPublishTimeMs: 20,
            }),
            insertSeasonRatingStatement({
              seasonId: "season2",
              averageRating: 2.5,
              updatedTimeMs: 1000,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
          capabilities: {
            canConsumeShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new ListSeasonsByRecentPublishTimeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          "https://test.com",
          () => 1000,
        );

        {
          // Execute
          let response = await handler.handle("", { limit: 2 }, "authStr");

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
                    averageRating: 3.5,
                  },
                  {
                    seasonId: "season2",
                    publisherId: "publisher2",
                    name: "name2",
                    coverImageUrl: "https://test.com/cover2",
                    totalEpisodes: 2,
                    averageRating: 2.5,
                  },
                ],
                publishTimeCursor: 20,
              },
              LIST_SEASONS_BY_RECENT_PUBLISH_TIME_RESPONSE,
            ),
            "response 1",
          );
        }

        {
          // Execute
          let response = await handler.handle(
            "",
            { publishTimeCursor: 20, limit: 2 },
            "authStr",
          );

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
                    totalEpisodes: 1,
                    averageRating: 4.5,
                  },
                ],
              },
              LIST_SEASONS_BY_RECENT_PUBLISH_TIME_RESPONSE,
            ),
            "response 2",
          );
        }
      },
      async tearDown() {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement("season1"),
            deleteSeasonStatement("season2"),
            deleteSeasonStatement("season3"),
            deleteSeasonStatement("season4"),
            deleteSeasonRatingStatement("season1"),
            deleteSeasonRatingStatement("season2"),
            deleteSeasonRatingStatement("season3"),
            deleteSeasonRatingStatement("season4"),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
