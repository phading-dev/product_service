import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_SEASON_ROW,
  LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
  deleteSeasonStatement,
  getSeason,
  insertEpisodeStatement,
  insertSeasonStatement,
  listNextEpisodesForPublisher,
} from "../../../db/sql";
import { UpdateEpisodeOrderHandler } from "./update_episode_order_handler";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { newBadRequestError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "UpdateEpisodeOrderHandlerTest",
  cases: [
    {
      name: "MoveAhead",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              totalEpisodes: 5,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              index: 2,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              index: 3,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode4",
              index: 4,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode5",
              index: 5,
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
        let handler = new UpdateEpisodeOrderHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "episode4",
            toIndex: 1,
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          await getSeason(SPANNER_DATABASE, { seasonSeasonIdEq: "season1" }),
          isArray([
            eqMessage(
              {
                seasonSeasonId: "season1",
                seasonPublisherId: "publisher1",
                seasonTotalEpisodes: 5,
                seasonLastChangeTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "Season",
        );
        assertThat(
          await listNextEpisodesForPublisher(SPANNER_DATABASE, {
            seasonPublisherIdEq: "publisher1",
            episodeSeasonIdEq: "season1",
            episodeIndexGt: 0,
            limit: 10,
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode4",
                episodeIndex: 1,
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode1",
                episodeIndex: 2,
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode2",
                episodeIndex: 3,
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode3",
                episodeIndex: 4,
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode5",
                episodeIndex: 5,
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
          ]),
          "Episodes",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "MoveBack",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              totalEpisodes: 5,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              index: 2,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              index: 3,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode4",
              index: 4,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode5",
              index: 5,
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
        let handler = new UpdateEpisodeOrderHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "episode3",
            toIndex: 5,
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          await getSeason(SPANNER_DATABASE, { seasonSeasonIdEq: "season1" }),
          isArray([
            eqMessage(
              {
                seasonSeasonId: "season1",
                seasonPublisherId: "publisher1",
                seasonTotalEpisodes: 5,
                seasonLastChangeTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "Season",
        );
        assertThat(
          await listNextEpisodesForPublisher(SPANNER_DATABASE, {
            seasonPublisherIdEq: "publisher1",
            episodeSeasonIdEq: "season1",
            episodeIndexGt: 0,
            limit: 10,
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode1",
                episodeIndex: 1,
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode2",
                episodeIndex: 2,
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode4",
                episodeIndex: 3,
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode5",
                episodeIndex: 4,
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode3",
                episodeIndex: 5,
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
          ]),
          "Episodes",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "MoveAheadToNearByIndex",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              totalEpisodes: 3,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              index: 2,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              index: 3,
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
        let handler = new UpdateEpisodeOrderHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "episode3",
            toIndex: 2,
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          await listNextEpisodesForPublisher(SPANNER_DATABASE, {
            seasonPublisherIdEq: "publisher1",
            episodeSeasonIdEq: "season1",
            episodeIndexGt: 0,
            limit: 10,
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode1",
                episodeIndex: 1,
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode3",
                episodeIndex: 2,
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode2",
                episodeIndex: 3,
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
          ]),
          "Episodes",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "MoveBackToNearByIndex",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              totalEpisodes: 3,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              index: 2,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              index: 3,
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
        let handler = new UpdateEpisodeOrderHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "episode1",
            toIndex: 2,
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          await listNextEpisodesForPublisher(SPANNER_DATABASE, {
            seasonPublisherIdEq: "publisher1",
            episodeSeasonIdEq: "season1",
            episodeIndexGt: 0,
            limit: 10,
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode2",
                episodeIndex: 1,
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode1",
                episodeIndex: 2,
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode3",
                episodeIndex: 3,
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
          ]),
          "Episodes",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "MoveAcrossLotsOfEpisodes",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              totalEpisodes: 1000,
            }),
            ...Array.from({ length: 1000 }, (_, i) =>
              insertEpisodeStatement({
                seasonId: "season1",
                episodeId: `episode${i + 1}`,
                index: i + 1,
              }),
            ),
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
        let handler = new UpdateEpisodeOrderHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "episode1000",
            toIndex: 1,
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          await listNextEpisodesForPublisher(SPANNER_DATABASE, {
            seasonPublisherIdEq: "publisher1",
            episodeSeasonIdEq: "season1",
            episodeIndexGt: 0,
            limit: 2000,
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode1000",
                episodeIndex: 1,
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            ...Array.from({ length: 999 }, (_, i) =>
              eqMessage(
                {
                  episodeSeasonId: "season1",
                  episodeEpisodeId: `episode${i + 1}`,
                  episodeIndex: i + 2,
                },
                LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
              ),
            ),
          ]),
          "Episodes",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "AlreadyMoved",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              totalEpisodes: 3,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              index: 2,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              index: 3,
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
        let handler = new UpdateEpisodeOrderHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              episodeId: "episode2",
              toIndex: 2,
            },
            "sessionStr",
          ),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newBadRequestError(
              `Season season1 episode episode2 is already at index 2.`,
            ),
          ),
          "Error",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "MoveOutOfBound",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              totalEpisodes: 3,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              index: 2,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              index: 3,
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
        let handler = new UpdateEpisodeOrderHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              episodeId: "episode2",
              toIndex: 4,
            },
            "sessionStr",
          ),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newBadRequestError(
              `Season season1 episode episode2's target index 4 is larger than the total number of episodes which is 3.`,
            ),
          ),
          "Error",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
