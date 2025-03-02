import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { deleteSeasonStatement, insertSeasonStatement } from "../../../db/sql";
import { ListSeasonsHandler } from "./list_seasons_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { LIST_SEASONS_RESPONSE } from "@phading/product_service_interface/show/web/publisher/interface";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "ListSeasonsHandlerTest",
  cases: [
    {
      name: "ListPublishedUntilEnd",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              name: "Season 1",
              coverImageR2Filename: "season1.jpg",
              lastChangeTimeMs: 100,
              totalEpisodes: 1,
            }),
            insertSeasonStatement({
              seasonId: "season2",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              name: "Season 2",
              coverImageR2Filename: "season2.jpg",
              lastChangeTimeMs: 200,
              totalEpisodes: 2,
            }),
            insertSeasonStatement({
              seasonId: "season3",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              name: "Season 3",
              lastChangeTimeMs: 300,
              totalEpisodes: 3,
            }),
            insertSeasonStatement({
              seasonId: "season4",
              publisherId: "publisher2",
              state: SeasonState.PUBLISHED,
              name: "Season 4",
              lastChangeTimeMs: 400,
              totalEpisodes: 4,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublishShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new ListSeasonsHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          "https://cover_image_public_access_domain",
          () => 1000,
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            state: SeasonState.PUBLISHED,
            limit: 2,
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              seasons: [
                {
                  seasonId: "season3",
                  name: "Season 3",
                  totalEpisodes: 3,
                  lastChangeTimeMs: 300,
                },
                {
                  seasonId: "season2",
                  name: "Season 2",
                  coverImageUrl:
                    "https://cover_image_public_access_domain/season2.jpg",
                  totalEpisodes: 2,
                  lastChangeTimeMs: 200,
                },
              ],
              lastChangeTimeCursor: 200,
            },
            LIST_SEASONS_RESPONSE,
          ),
          "response",
        );

        // Execute
        response = await handler.handle(
          "",
          {
            state: SeasonState.PUBLISHED,
            limit: 2,
            lastChangeTimeCursor: 200,
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              seasons: [
                {
                  seasonId: "season1",
                  name: "Season 1",
                  coverImageUrl:
                    "https://cover_image_public_access_domain/season1.jpg",
                  totalEpisodes: 1,
                  lastChangeTimeMs: 100,
                },
              ],
            },
            LIST_SEASONS_RESPONSE,
          ),
          "response 2",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement("season1"),
            deleteSeasonStatement("season2"),
            deleteSeasonStatement("season3"),
            deleteSeasonStatement("season4"),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
