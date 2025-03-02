import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertEpisodeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { ListEpisodesHandler } from "./list_episodes_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { LIST_EPISODES_RESPONSE } from "@phading/product_service_interface/show/web/consumer/interface";
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
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode4",
              name: "Ep 4",
              index: 4,
              videoContainer: {
                durationSec: 240,
              },
              publishTimeMs: 123000,
              premierTimeMs: 123000,
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
        let handler = new ListEpisodesHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
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
                  videoDurationSec: 60,
                  premierTimeMs: 1000,
                },
                {
                  episodeId: "episode2",
                  name: "Ep 2",
                  index: 2,
                  videoDurationSec: 120,
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
                  videoDurationSec: 180,
                  premierTimeMs: 3000,
                },
              ],
            },
            LIST_EPISODES_RESPONSE,
          ),
          "response 2",
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
              state: SeasonState.PUBLISHED,
              lastChangeTimeMs: 100,
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
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode4",
              name: "Ep 4",
              index: 4,
              videoContainer: {
                durationSec: 240,
              },
              publishTimeMs: 123000,
              premierTimeMs: 123000,
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
        let handler = new ListEpisodesHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
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
                  videoDurationSec: 180,
                  premierTimeMs: 3000,
                },
                {
                  episodeId: "episode2",
                  name: "Ep 2",
                  index: 2,
                  videoDurationSec: 120,
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
                  videoDurationSec: 60,
                  premierTimeMs: 1000,
                },
              ],
            },
            LIST_EPISODES_RESPONSE,
          ),
          "response 2",
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
      name: "SeasonNotPublished",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.DRAFT,
              lastChangeTimeMs: 100,
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
        let handler = new ListEpisodesHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
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
