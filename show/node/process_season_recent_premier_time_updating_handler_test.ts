import "../../local/env";
import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  GET_SEASON_RECENT_PREMIER_TIME_UPDATING_TASK_METADATA_ROW,
  GET_SEASON_ROW,
  deleteEpisodeStatement,
  deleteSeasonRecentPremierTimeUpdatingTaskStatement,
  deleteSeasonStatement,
  getSeason,
  getSeasonRecentPremierTimeUpdatingTask,
  insertEpisodeStatement,
  insertSeasonRecentPremierTimeUpdatingTaskStatement,
  insertSeasonStatement,
  listPendingSeasonRecentPremierTimeUpdatingTasks,
} from "../../db/sql";
import { ProcessSeasonRecentPremierTimeUpdatingTaskHandler } from "./process_season_recent_premier_time_updating_handler";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

async function cleanupAll() {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    await transaction.batchUpdate([
      deleteSeasonStatement({
        seasonSeasonIdEq: "season1",
      }),
      deleteEpisodeStatement({
        episodeSeasonIdEq: "season1",
        episodeEpisodeIdEq: "episode1",
      }),
      deleteEpisodeStatement({
        episodeSeasonIdEq: "season1",
        episodeEpisodeIdEq: "episode2",
      }),
      deleteEpisodeStatement({
        episodeSeasonIdEq: "season1",
        episodeEpisodeIdEq: "episode3",
      }),
      deleteSeasonRecentPremierTimeUpdatingTaskStatement({
        seasonRecentPremierTimeUpdatingTaskSeasonIdEq: "season1",
        seasonRecentPremierTimeUpdatingTaskEpisodeIdEq: "episode1",
      }),
    ]);
    await transaction.commit();
  });
}

TEST_RUNNER.run({
  name: "ProcessSeasonRecentPremierTimeUpdatingTaskHandlerTest",
  cases: [
    {
      name: "ProcessTask",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              recentPremierTimeMs: 9000,
              createdTimeMs: 1000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              premierTimeMs: 500,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              premierTimeMs: 900,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              premierTimeMs: 2000,
            }),
            insertSeasonRecentPremierTimeUpdatingTaskStatement({
              seasonId: "season1",
              episodeId: "episode1",
              retryCount: 0,
              executionTimeMs: 1000,
            }),
          ]);
          await transaction.commit();
        });
        let handler = new ProcessSeasonRecentPremierTimeUpdatingTaskHandler(
          SPANNER_DATABASE,
          () => 1000,
        );

        // Execute
        await handler.processTask("", {
          seasonId: "season1",
          episodeId: "episode1",
        });

        // Verify
        assertThat(
          await getSeason(SPANNER_DATABASE, {
            seasonSeasonIdEq: "season1",
          }),
          isArray([
            eqMessage(
              {
                seasonSeasonId: "season1",
                seasonRecentPremierTimeMs: 900,
                seasonCreatedTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "season",
        );
        assertThat(
          await listPendingSeasonRecentPremierTimeUpdatingTasks(
            SPANNER_DATABASE,
            {
              seasonRecentPremierTimeUpdatingTaskExecutionTimeMsLe: 1000000,
            },
          ),
          isArray([]),
          "pending tasks",
        );
      },
      tearDown: async () => {
        await cleanupAll();
      },
    },
    {
      name: "SamePremierTime",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              recentPremierTimeMs: 900,
              createdTimeMs: 1000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              premierTimeMs: 900,
            }),
            insertSeasonRecentPremierTimeUpdatingTaskStatement({
              seasonId: "season1",
              episodeId: "episode1",
              retryCount: 0,
              executionTimeMs: 1000,
            }),
          ]);
          await transaction.commit();
        });
        let handler = new ProcessSeasonRecentPremierTimeUpdatingTaskHandler(
          SPANNER_DATABASE,
          () => 1000,
        );

        // Execute
        await handler.processTask("", {
          seasonId: "season1",
          episodeId: "episode1",
        });

        // Verify
        assertThat(
          await getSeason(SPANNER_DATABASE, {
            seasonSeasonIdEq: "season1",
          }),
          isArray([
            eqMessage(
              {
                seasonSeasonId: "season1",
                seasonRecentPremierTimeMs: 900,
                seasonCreatedTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "season",
        );
        assertThat(
          await listPendingSeasonRecentPremierTimeUpdatingTasks(
            SPANNER_DATABASE,
            {
              seasonRecentPremierTimeUpdatingTaskExecutionTimeMsLe: 1000000,
            },
          ),
          isArray([]),
          "pending tasks",
        );
      },
      tearDown: async () => {
        await cleanupAll();
      },
    },
    {
      name: "ClaimTask",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonRecentPremierTimeUpdatingTaskStatement({
              seasonId: "season1",
              episodeId: "episode1",
              retryCount: 0,
              executionTimeMs: 1000,
            }),
          ]);
          await transaction.commit();
        });
        let handler = new ProcessSeasonRecentPremierTimeUpdatingTaskHandler(
          SPANNER_DATABASE,
          () => 1000,
        );

        // Execute
        await handler.claimTask("", {
          seasonId: "season1",
          episodeId: "episode1",
        });

        // Verify
        assertThat(
          await getSeasonRecentPremierTimeUpdatingTask(SPANNER_DATABASE, {
            seasonRecentPremierTimeUpdatingTaskSeasonIdEq: "season1",
            seasonRecentPremierTimeUpdatingTaskEpisodeIdEq: "episode1",
          }),
          isArray([
            eqMessage(
              {
                seasonRecentPremierTimeUpdatingTaskRetryCount: 1,
                seasonRecentPremierTimeUpdatingTaskExecutionTimeMs: 301000,
              },
              GET_SEASON_RECENT_PREMIER_TIME_UPDATING_TASK_METADATA_ROW,
            ),
          ]),
          "task",
        );
      },
      tearDown: async () => {
        await cleanupAll();
      },
    },
  ],
});
