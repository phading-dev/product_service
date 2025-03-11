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
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
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
              state: SeasonState.PUBLISHED,
              totalEpisodes: 5,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              publishTimeMs: 200,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              index: 2,
              publishTimeMs: 300,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              index: 3,
              publishTimeMs: 400,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode4",
              index: 4,
              publishTimeMs: 500,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode5",
              index: 5,
              publishTimeMs: 600,
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
          await getSeason(SPANNER_DATABASE, "season1"),
          isArray([
            eqMessage(
              {
                seasonData: {
                  seasonId: "season1",
                  publisherId: "publisher1",
                  state: SeasonState.PUBLISHED,
                  totalEpisodes: 5,
                  lastChangeTimeMs: 1000,
                  recentPremierTimeMs: 100,
                },
              },
              GET_SEASON_ROW,
            ),
          ]),
          "Season",
        );
        assertThat(
          await listNextEpisodesForPublisher(
            SPANNER_DATABASE,
            "publisher1",
            "season1",
            0,
            10,
          ),
          isArray([
            eqMessage(
              {
                eData: {
                  seasonId: "season1",
                  episodeId: "episode4",
                  index: 1,
                  publishTimeMs: 500,
                },
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                eData: {
                  seasonId: "season1",
                  episodeId: "episode1",
                  index: 2,
                  publishTimeMs: 200,
                },
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                eData: {
                  seasonId: "season1",
                  episodeId: "episode2",
                  index: 3,
                  publishTimeMs: 300,
                },
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                eData: {
                  seasonId: "season1",
                  episodeId: "episode3",
                  index: 4,
                  publishTimeMs: 400,
                },
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                eData: {
                  seasonId: "season1",
                  episodeId: "episode5",
                  index: 5,
                  publishTimeMs: 600,
                },
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
          ]),
          "Episodes",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([deleteSeasonStatement("season1")]);
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
              state: SeasonState.PUBLISHED,
              totalEpisodes: 5,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              publishTimeMs: 200,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              index: 2,
              publishTimeMs: 300,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              index: 3,
              publishTimeMs: 400,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode4",
              index: 4,
              publishTimeMs: 500,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode5",
              index: 5,
              publishTimeMs: 600,
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
          await getSeason(SPANNER_DATABASE, "season1"),
          isArray([
            eqMessage(
              {
                seasonData: {
                  seasonId: "season1",
                  publisherId: "publisher1",
                  state: SeasonState.PUBLISHED,
                  totalEpisodes: 5,
                  lastChangeTimeMs: 1000,
                  recentPremierTimeMs: 100,
                },
              },
              GET_SEASON_ROW,
            ),
          ]),
          "Season",
        );
        assertThat(
          await listNextEpisodesForPublisher(
            SPANNER_DATABASE,
            "publisher1",
            "season1",
            0,
            10,
          ),
          isArray([
            eqMessage(
              {
                eData: {
                  seasonId: "season1",
                  episodeId: "episode1",
                  index: 1,
                  publishTimeMs: 200,
                },
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                eData: {
                  seasonId: "season1",
                  episodeId: "episode2",
                  index: 2,
                  publishTimeMs: 300,
                },
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                eData: {
                  seasonId: "season1",
                  episodeId: "episode4",
                  index: 3,
                  publishTimeMs: 500,
                },
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                eData: {
                  seasonId: "season1",
                  episodeId: "episode5",
                  index: 4,
                  publishTimeMs: 600,
                },
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                eData: {
                  seasonId: "season1",
                  episodeId: "episode3",
                  index: 5,
                  publishTimeMs: 400,
                },
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
          ]),
          "Episodes",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([deleteSeasonStatement("season1")]);
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
              state: SeasonState.PUBLISHED,
              totalEpisodes: 3,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              publishTimeMs: 200,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              index: 2,
              publishTimeMs: 300,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              index: 3,
              publishTimeMs: 400,
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
          await listNextEpisodesForPublisher(
            SPANNER_DATABASE,
            "publisher1",
            "season1",
            0,
            10,
          ),
          isArray([
            eqMessage(
              {
                eData: {
                  seasonId: "season1",
                  episodeId: "episode1",
                  index: 1,
                  publishTimeMs: 200,
                },
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                eData: {
                  seasonId: "season1",
                  episodeId: "episode3",
                  index: 2,
                  publishTimeMs: 400,
                },
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                eData: {
                  seasonId: "season1",
                  episodeId: "episode2",
                  index: 3,
                  publishTimeMs: 300,
                },
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
          ]),
          "Episodes",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([deleteSeasonStatement("season1")]);
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
              state: SeasonState.PUBLISHED,
              totalEpisodes: 3,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              publishTimeMs: 200,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              index: 2,
              publishTimeMs: 300,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              index: 3,
              publishTimeMs: 400,
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
          await listNextEpisodesForPublisher(
            SPANNER_DATABASE,
            "publisher1",
            "season1",
            0,
            10,
          ),
          isArray([
            eqMessage(
              {
                eData: {
                  seasonId: "season1",
                  episodeId: "episode2",
                  index: 1,
                  publishTimeMs: 300,
                },
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                eData: {
                  seasonId: "season1",
                  episodeId: "episode1",
                  index: 2,
                  publishTimeMs: 200,
                },
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                eData: {
                  seasonId: "season1",
                  episodeId: "episode3",
                  index: 3,
                  publishTimeMs: 400,
                },
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
          ]),
          "Episodes",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([deleteSeasonStatement("season1")]);
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
              state: SeasonState.PUBLISHED,
              totalEpisodes: 1000,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
            ...Array.from({ length: 1000 }, (_, i) =>
              insertEpisodeStatement({
                seasonId: "season1",
                episodeId: `episode${i + 1}`,
                index: i + 1,
                publishTimeMs: 200,
              }),
            ),
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
          await listNextEpisodesForPublisher(
            SPANNER_DATABASE,
            "publisher1",
            "season1",
            0,
            2000,
          ),
          isArray([
            eqMessage(
              {
                eData: {
                  seasonId: "season1",
                  episodeId: "episode1000",
                  index: 1,
                  publishTimeMs: 200,
                },
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            ...Array.from({ length: 999 }, (_, i) =>
              eqMessage(
                {
                  eData: {
                    seasonId: "season1",
                    episodeId: `episode${i + 1}`,
                    index: i + 2,
                    publishTimeMs: 200,
                  },
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
          await transaction.batchUpdate([deleteSeasonStatement("season1")]);
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
              state: SeasonState.PUBLISHED,
              totalEpisodes: 3,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              publishTimeMs: 200,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              index: 2,
              publishTimeMs: 300,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              index: 3,
              publishTimeMs: 400,
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
          await transaction.batchUpdate([deleteSeasonStatement("season1")]);
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
              state: SeasonState.PUBLISHED,
              totalEpisodes: 3,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              publishTimeMs: 200,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              index: 2,
              publishTimeMs: 300,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              index: 3,
              publishTimeMs: 400,
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
          await transaction.batchUpdate([deleteSeasonStatement("season1")]);
          await transaction.commit();
        });
      },
    },
  ],
});
