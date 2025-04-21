import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertEpisodeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { ListEpisodesHandler } from "./list_episodes_handler";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { LIST_EPISODES_RESPONSE } from "@phading/product_service_interface/show/web/consumer/interface";
import { eqMessage } from "@selfage/message/test_matcher";
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
              state: SeasonState.PUBLISHED,
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
              state: EpisodeState.PUBLISHED,
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
              state: EpisodeState.DRAFT,
              premiereTimeMs: 4000,
            }),
          ]);
          await transaction.commit();
        });
        let handler = new ListEpisodesHandler(SPANNER_DATABASE);

        // Execute
        let response = await handler.handle("", {
          seasonId: "season1",
          next: true,
          limit: 2,
        });

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
                  premiereTimeMs: 1000,
                },
                {
                  episodeId: "episode2",
                  name: "Ep 2",
                  index: 2,
                  videoDurationSec: 120,
                  premiereTimeMs: 2000,
                },
              ],
              indexCursor: 2,
            },
            LIST_EPISODES_RESPONSE,
          ),
          "response",
        );

        // Execute
        response = await handler.handle("", {
          seasonId: "season1",
          next: true,
          indexCursor: 2,
          limit: 2,
        });

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
                  premiereTimeMs: 3000,
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
          await transaction.batchUpdate([
            deleteSeasonStatement({
              seasonSeasonIdEq: "season1",
            }),
          ]);
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
              state: SeasonState.PUBLISHED,
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
              state: EpisodeState.PUBLISHED,
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
              state: EpisodeState.DRAFT,
              premiereTimeMs: 4000,
            }),
          ]);
          await transaction.commit();
        });
        let handler = new ListEpisodesHandler(SPANNER_DATABASE);

        // Execute
        let response = await handler.handle("", {
          seasonId: "season1",
          next: false,
          limit: 2,
        });

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
                  premiereTimeMs: 3000,
                },
                {
                  episodeId: "episode2",
                  name: "Ep 2",
                  index: 2,
                  videoDurationSec: 120,
                  premiereTimeMs: 2000,
                },
              ],
              indexCursor: 2,
            },
            LIST_EPISODES_RESPONSE,
          ),
          "response",
        );

        // Execute
        response = await handler.handle("", {
          seasonId: "season1",
          next: false,
          indexCursor: 2,
          limit: 2,
        });

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
                  premiereTimeMs: 1000,
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
          await transaction.batchUpdate([
            deleteSeasonStatement({
              seasonSeasonIdEq: "season1",
            }),
          ]);
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
              state: SeasonState.DRAFT,
              createdTimeMs: 1000,
            }),
          ]);
          await transaction.commit();
        });
        let handler = new ListEpisodesHandler(SPANNER_DATABASE);

        // Execute
        let response = await handler.handle("", {
          seasonId: "season1",
          next: true,
          limit: 2,
        });

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
          await transaction.batchUpdate([
            deleteSeasonStatement({
              seasonSeasonIdEq: "season1",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
