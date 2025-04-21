import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertEpisodeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { ListPublishedEpisodesHandler } from "./list_published_episodes_handler";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { LIST_PUBLISHED_EPISODES_RESPONSE } from "@phading/product_service_interface/show/web/publisher/interface";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

async function insertEpisodes() {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    await transaction.batchUpdate([
      insertSeasonStatement({
        seasonId: "season1",
        publisherId: "publisher1",
        createdTimeMs: 1000,
      }),
      insertEpisodeStatement({
        seasonId: "season1",
        episodeId: "episode1",
        name: "Ep 1",
        index: 1,
        videoContainer: {
          durationSec: 60,
        },
        state: EpisodeState.PUBLISHED,
        premiereTimeMs: 1000,
      }),
      insertEpisodeStatement({
        seasonId: "season1",
        episodeId: "episode2",
        name: "Ep 2",
        index: 2,
        videoContainer: {
          durationSec: 120,
        },
        state: EpisodeState.PUBLISHED,
        premiereTimeMs: 2000,
      }),
      insertEpisodeStatement({
        seasonId: "season1",
        episodeId: "episode3",
        name: "Ep 3",
        index: 3,
        videoContainer: {
          durationSec: 180,
        },
        state: EpisodeState.DRAFT,
        premiereTimeMs: 3000,
      }),
      insertEpisodeStatement({
        seasonId: "season1",
        episodeId: "episode4",
        name: "Ep 4",
        index: 4,
        videoContainer: {
          durationSec: 240,
        },
        state: EpisodeState.PUBLISHED,
        premiereTimeMs: 4000,
      }),
    ]);
    await transaction.commit();
  });
}

async function deleteEpisodes() {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    await transaction.batchUpdate([
      deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
    ]);
    await transaction.commit();
  });
}

TEST_RUNNER.run({
  name: "ListPublishedEpisodesHandlerTest",
  cases: [
    {
      name: "ListNextUntilEnd",
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
        let handler = new ListPublishedEpisodesHandler(
          SPANNER_DATABASE,
          serviceClientMock,
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            seasonId: "season1",
            next: true,
            limit: 2,
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              episodes: [
                {
                  episodeId: "episode1",
                  name: "Ep 1",
                  index: 1,
                  videoContainer: {
                    durationSec: 60,
                  },
                  state: EpisodeState.PUBLISHED,
                  premiereTimeMs: 1000,
                },
                {
                  episodeId: "episode2",
                  name: "Ep 2",
                  index: 2,
                  videoContainer: {
                    durationSec: 120,
                  },
                  state: EpisodeState.PUBLISHED,
                  premiereTimeMs: 2000,
                },
              ],
              indexCursor: 2,
            },
            LIST_PUBLISHED_EPISODES_RESPONSE,
          ),
          "response",
        );

        // Execute
        response = await handler.handle(
          "",
          {
            seasonId: "season1",
            next: true,
            indexCursor: 2,
            limit: 2,
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              episodes: [
                {
                  episodeId: "episode4",
                  name: "Ep 4",
                  index: 4,
                  videoContainer: {
                    durationSec: 240,
                  },
                  state: EpisodeState.PUBLISHED,
                  premiereTimeMs: 4000,
                },
              ],
            },
            LIST_PUBLISHED_EPISODES_RESPONSE,
          ),
          "response",
        );
      },
      tearDown: async () => {
        await deleteEpisodes();
      },
    },
    {
      name: "ListPrevUntilEnd",
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
        let handler = new ListPublishedEpisodesHandler(
          SPANNER_DATABASE,
          serviceClientMock,
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            seasonId: "season1",
            next: false,
            limit: 2,
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              episodes: [
                {
                  episodeId: "episode4",
                  name: "Ep 4",
                  index: 4,
                  videoContainer: {
                    durationSec: 240,
                  },
                  state: EpisodeState.PUBLISHED,
                  premiereTimeMs: 4000,
                },
                {
                  episodeId: "episode2",
                  name: "Ep 2",
                  index: 2,
                  videoContainer: {
                    durationSec: 120,
                  },
                  state: EpisodeState.PUBLISHED,
                  premiereTimeMs: 2000,
                },
              ],
              indexCursor: 2,
            },
            LIST_PUBLISHED_EPISODES_RESPONSE,
          ),
          "response",
        );

        // Execute
        response = await handler.handle(
          "",
          {
            seasonId: "season1",
            next: false,
            indexCursor: 2,
            limit: 2,
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              episodes: [
                {
                  episodeId: "episode1",
                  name: "Ep 1",
                  index: 1,
                  videoContainer: {
                    durationSec: 60,
                  },
                  state: EpisodeState.PUBLISHED,
                  premiereTimeMs: 1000,
                },
              ],
            },
            LIST_PUBLISHED_EPISODES_RESPONSE,
          ),
          "response",
        );
      },
      tearDown: async () => {
        await deleteEpisodes();
      },
    },
    {
      name: "SeasonNotOwned",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              createdTimeMs: 1000,
            }),
            insertEpisodeStatement({
              episodeId: "episode1",
              seasonId: "season1",
              name: "Ep 1",
              index: 1,
              videoContainer: {
                durationSec: 60,
              },
              state: EpisodeState.PUBLISHED,
              premiereTimeMs: 1000,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher2",
          capabilities: {
            canPublish: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new ListPublishedEpisodesHandler(
          SPANNER_DATABASE,
          serviceClientMock,
        );

        // Execute
        let response = await handler.handle(
          "",
          { seasonId: "season1", next: true, limit: 2 },
          "sessionStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              episodes: [],
            },
            LIST_PUBLISHED_EPISODES_RESPONSE,
          ),
          "response",
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
