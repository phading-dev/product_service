import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_SEASON_ROW,
  LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
  deleteSeasonStatement,
  getSeason,
  insertEpisodeStatement,
  insertSeasonStatement,
  listNextPublishedEpisodesForPublisher,
} from "../../../db/sql";
import { UpdateEpisodeIndexHandler } from "./update_episode_index_handler";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { newBadRequestError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

async function insertEpisodes() {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    await transaction.batchUpdate([
      insertSeasonStatement({
        seasonId: "season1",
        publisherId: "publisher1",
        totalPublishedEpisodes: 5,
        createdTimeMs: 1000,
      }),
      insertEpisodeStatement({
        seasonId: "season1",
        episodeId: "episode1",
        state: EpisodeState.PUBLISHED,
        index: 1,
      }),
      insertEpisodeStatement({
        seasonId: "season1",
        episodeId: "episode2",
        state: EpisodeState.PUBLISHED,
        index: 2,
      }),
      insertEpisodeStatement({
        seasonId: "season1",
        episodeId: "episode3",
        state: EpisodeState.PUBLISHED,
        index: 3,
      }),
      insertEpisodeStatement({
        seasonId: "season1",
        episodeId: "episode4",
        state: EpisodeState.PUBLISHED,
        index: 4,
      }),
      insertEpisodeStatement({
        seasonId: "season1",
        episodeId: "episode5",
        state: EpisodeState.PUBLISHED,
        index: 5,
      }),
      insertEpisodeStatement({
        seasonId: "season1",
        episodeId: "episode6",
        state: EpisodeState.DRAFT,
      }),
    ]);
    await transaction.commit();
  });
}

TEST_RUNNER.run({
  name: "UpdateEpisodeIndexHandlerTest",
  cases: [
    {
      name: "MoveAhead",
      execute: async () => {
        // Prepare
        await insertEpisodes();
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublish: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new UpdateEpisodeIndexHandler(
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
                seasonTotalPublishedEpisodes: 5,
                seasonLastChangeTimeMs: 1000,
                seasonCreatedTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "Season",
        );
        assertThat(
          await listNextPublishedEpisodesForPublisher(SPANNER_DATABASE, {
            seasonPublisherIdEq: "publisher1",
            episodeSeasonIdEq: "season1",
            episodeStateEq: EpisodeState.PUBLISHED,
            episodeIndexGt: 0,
            limit: 10,
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode4",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 1,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode1",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 2,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode2",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 3,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode3",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 4,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode5",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 5,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
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
        await insertEpisodes();
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublish: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new UpdateEpisodeIndexHandler(
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
                seasonTotalPublishedEpisodes: 5,
                seasonLastChangeTimeMs: 1000,
                seasonCreatedTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "Season",
        );
        assertThat(
          await listNextPublishedEpisodesForPublisher(SPANNER_DATABASE, {
            seasonPublisherIdEq: "publisher1",
            episodeSeasonIdEq: "season1",
            episodeStateEq: EpisodeState.PUBLISHED,
            episodeIndexGt: 0,
            limit: 10,
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode1",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 1,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode2",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 2,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode4",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 3,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode5",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 4,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode3",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 5,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
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
        await insertEpisodes();
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublish: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new UpdateEpisodeIndexHandler(
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
          await listNextPublishedEpisodesForPublisher(SPANNER_DATABASE, {
            seasonPublisherIdEq: "publisher1",
            episodeSeasonIdEq: "season1",
            episodeStateEq: EpisodeState.PUBLISHED,
            episodeIndexGt: 0,
            limit: 10,
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode1",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 1,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode3",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 2,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode2",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 3,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode4",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 4,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode5",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 5,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
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
        await insertEpisodes();
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublish: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new UpdateEpisodeIndexHandler(
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
          await listNextPublishedEpisodesForPublisher(SPANNER_DATABASE, {
            seasonPublisherIdEq: "publisher1",
            episodeSeasonIdEq: "season1",
            episodeStateEq: EpisodeState.PUBLISHED,
            episodeIndexGt: 0,
            limit: 10,
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode2",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 1,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode1",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 2,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode3",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 3,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode4",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 4,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode5",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 5,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
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
              totalPublishedEpisodes: 1000,
              createdTimeMs: 1000,
            }),
            ...Array.from({ length: 1000 }, (_, i) =>
              insertEpisodeStatement({
                seasonId: "season1",
                episodeId: `episode${i + 1}`,
                state: EpisodeState.PUBLISHED,
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
        let handler = new UpdateEpisodeIndexHandler(
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
          await listNextPublishedEpisodesForPublisher(SPANNER_DATABASE, {
            seasonPublisherIdEq: "publisher1",
            episodeSeasonIdEq: "season1",
            episodeStateEq: EpisodeState.PUBLISHED,
            episodeIndexGt: 0,
            limit: 2000,
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode1000",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 1,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
            ),
            ...Array.from({ length: 999 }, (_, i) =>
              eqMessage(
                {
                  episodeSeasonId: "season1",
                  episodeEpisodeId: `episode${i + 1}`,
                  episodeState: EpisodeState.PUBLISHED,
                  episodeIndex: i + 2,
                },
                LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
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
        await insertEpisodes();
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublish: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new UpdateEpisodeIndexHandler(
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
        await insertEpisodes();
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublish: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new UpdateEpisodeIndexHandler(
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
              toIndex: 6,
            },
            "sessionStr",
          ),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newBadRequestError(
              `Season season1 episode episode2's target index 6 is larger than the total number of published episodes which is 5.`,
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
