import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_SEASON_MORE_ROW,
  GET_SEASON_ROW,
  deleteSeasonMoreStatement,
  deleteSeasonStatement,
  getSeason,
  getSeasonMore,
  insertSeasonMoreStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { UpdateSeasonHandler } from "./update_season_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "UpdateSeasonHandlerTest",
  cases: [
    {
      name: "UpdateWithoutDescription",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              name: "A name",
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
            insertSeasonMoreStatement({
              seasonId: "season1",
              description: "",
              createdTimeMs: 50,
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
        let handler = new UpdateSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            name: "A new name",
          },
          "session",
        );

        // Verify
        assertThat(
          await getSeason(SPANNER_DATABASE, "season1"),
          isArray([
            eqMessage(
              {
                seasonData: {
                  seasonId: "season1",
                  publisherId: "publisher1",
                  state: SeasonState.PUBLISHED,
                  name: "A new name",
                  lastChangeTimeMs: 1000,
                  recentPremierTimeMs: 100,
                },
              },
              GET_SEASON_ROW,
            ),
          ]),
          "GetSeason",
        );
        assertThat(
          await getSeasonMore(SPANNER_DATABASE, "season1"),
          isArray([
            eqMessage(
              {
                seasonMoreData: {
                  seasonId: "season1",
                  description: "",
                  createdTimeMs: 50,
                },
              },
              GET_SEASON_MORE_ROW,
            ),
          ]),
          "GetSeasonMore",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement("season1"),
            deleteSeasonMoreStatement("season1"),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "UpdateWithDescription",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              name: "Another name",
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
            insertSeasonMoreStatement({
              seasonId: "season1",
              description: "Initial description",
              createdTimeMs: 50,
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
        let handler = new UpdateSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            name: "Updated name",
            description: "Updated description",
          },
          "session",
        );

        // Verify
        assertThat(
          await getSeason(SPANNER_DATABASE, "season1"),
          isArray([
            eqMessage(
              {
                seasonData: {
                  seasonId: "season1",
                  publisherId: "publisher1",
                  state: SeasonState.PUBLISHED,
                  name: "Updated name",
                  lastChangeTimeMs: 1000,
                  recentPremierTimeMs: 100,
                },
              },
              GET_SEASON_ROW,
            ),
          ]),
          "GetSeason",
        );
        assertThat(
          await getSeasonMore(SPANNER_DATABASE, "season1"),
          isArray([
            eqMessage(
              {
                seasonMoreData: {
                  seasonId: "season1",
                  description: "Updated description",
                  createdTimeMs: 50,
                },
              },
              GET_SEASON_MORE_ROW,
            ),
          ]),
          "GetSeasonMore",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement("season1"),
            deleteSeasonMoreStatement("season1"),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
