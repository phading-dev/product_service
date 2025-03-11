import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertEpisodeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { ListEpisodesHandler } from "./list_episodes_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { LIST_EPISODES_RESPONSE } from "@phading/product_service_interface/show/web/publisher/interface";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "ListEpisodesHandlerTest",
  cases: [
    {
      name: "ListNextUntilEnd",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              name: "Ep 1",
              index: 1,
              videoContainer: {
                durationSec: 60,
              },
              publishTimeMs: 100,
              premierTimeMs: 1000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              name: "Ep 2",
              index: 2,
              videoContainer: {
                durationSec: 120,
              },
              publishTimeMs: 200,
              premierTimeMs: 2000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              name: "Ep 3",
              index: 3,
              videoContainer: {
                durationSec: 180,
              },
              publishTimeMs: 300,
              premierTimeMs: 3000,
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
        let handler = new ListEpisodesHandler(
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
                  publishTimeMs: 100,
                  premierTimeMs: 1000,
                },
                {
                  episodeId: "episode2",
                  name: "Ep 2",
                  index: 2,
                  videoContainer: {
                    durationSec: 120,
                  },
                  publishTimeMs: 200,
                  premierTimeMs: 2000,
                },
              ],
              indexCursor: 2,
            },
            LIST_EPISODES_RESPONSE,
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
                  episodeId: "episode3",
                  name: "Ep 3",
                  index: 3,
                  videoContainer: {
                    durationSec: 180,
                  },
                  publishTimeMs: 300,
                  premierTimeMs: 3000,
                },
              ],
            },
            LIST_EPISODES_RESPONSE,
          ),
          "response",
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
      name: "ListPrevUntilEnd",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.DRAFT,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
            insertEpisodeStatement({
              episodeId: "episode1",
              seasonId: "season1",
              name: "Ep 1",
              index: 1,
              videoContainer: {
                durationSec: 60,
              },
              publishTimeMs: 100,
              premierTimeMs: 1000,
            }),
            insertEpisodeStatement({
              episodeId: "episode2",
              seasonId: "season1",
              name: "Ep 2",
              index: 2,
              videoContainer: {
                durationSec: 120,
              },
              publishTimeMs: 200,
              premierTimeMs: 2000,
            }),
            insertEpisodeStatement({
              episodeId: "episode3",
              seasonId: "season1",
              name: "Ep 3",
              index: 3,
              videoContainer: {
                durationSec: 180,
              },
              publishTimeMs: 300,
              premierTimeMs: 3000,
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
        let handler = new ListEpisodesHandler(
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
                  episodeId: "episode3",
                  name: "Ep 3",
                  index: 3,
                  videoContainer: {
                    durationSec: 180,
                  },
                  publishTimeMs: 300,
                  premierTimeMs: 3000,
                },
                {
                  episodeId: "episode2",
                  name: "Ep 2",
                  index: 2,
                  videoContainer: {
                    durationSec: 120,
                  },
                  publishTimeMs: 200,
                  premierTimeMs: 2000,
                },
              ],
              indexCursor: 2,
            },
            LIST_EPISODES_RESPONSE,
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
                  publishTimeMs: 100,
                  premierTimeMs: 1000,
                },
              ],
            },
            LIST_EPISODES_RESPONSE,
          ),
          "response",
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
      name: "SeasonNotOwned",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.DRAFT,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
            insertEpisodeStatement({
              episodeId: "episode1",
              seasonId: "season1",
              name: "Ep 1",
              index: 1,
              videoContainer: {
                durationSec: 60,
              },
              publishTimeMs: 100,
              premierTimeMs: 1000,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher2",
          capabilities: {
            canPublishShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new ListEpisodesHandler(
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
            LIST_EPISODES_RESPONSE,
          ),
          "response",
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
