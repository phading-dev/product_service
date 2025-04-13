import "../../local/env";
import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  GET_SEASON_RECENT_PREMIERE_TIME_UPDATING_TASK_METADATA_ROW,
  GET_SEASON_ROW,
  deleteEpisodeStatement,
  deleteSeasonRecentPremiereTimeUpdatingTaskStatement,
  deleteSeasonStatement,
  getSeason,
  getSeasonRecentPremiereTimeUpdatingTask,
  insertEpisodeStatement,
  insertSeasonRecentPremiereTimeUpdatingTaskStatement,
  insertSeasonStatement,
  listPendingSeasonRecentPremiereTimeUpdatingTasks,
} from "../../db/sql";
import { ProcessSeasonRecentPremiereTimeUpdatingTaskHandler } from "./process_season_recent_premiere_time_updating_handler";
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
      deleteSeasonRecentPremiereTimeUpdatingTaskStatement({
        seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: "season1",
        seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: "episode1",
      }),
    ]);
    await transaction.commit();
  });
}

TEST_RUNNER.run({
  name: "ProcessSeasonRecentPremiereTimeUpdatingTaskHandlerTest",
  cases: [
    {
      name: "ProcessTask",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              recentPremiereTimeMs: 9000,
              createdTimeMs: 1000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              premiereTimeMs: 500,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              premiereTimeMs: 900,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              premiereTimeMs: 2000,
            }),
            insertSeasonRecentPremiereTimeUpdatingTaskStatement({
              seasonId: "season1",
              episodeId: "episode1",
              retryCount: 0,
              executionTimeMs: 1000,
            }),
          ]);
          await transaction.commit();
        });
        let handler = new ProcessSeasonRecentPremiereTimeUpdatingTaskHandler(
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
                seasonRecentPremiereTimeMs: 900,
                seasonCreatedTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "season",
        );
        assertThat(
          await listPendingSeasonRecentPremiereTimeUpdatingTasks(
            SPANNER_DATABASE,
            {
              seasonRecentPremiereTimeUpdatingTaskExecutionTimeMsLe: 1000000,
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
      name: "SamePremiereTime",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              recentPremiereTimeMs: 900,
              createdTimeMs: 1000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              premiereTimeMs: 900,
            }),
            insertSeasonRecentPremiereTimeUpdatingTaskStatement({
              seasonId: "season1",
              episodeId: "episode1",
              retryCount: 0,
              executionTimeMs: 1000,
            }),
          ]);
          await transaction.commit();
        });
        let handler = new ProcessSeasonRecentPremiereTimeUpdatingTaskHandler(
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
                seasonRecentPremiereTimeMs: 900,
                seasonCreatedTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "season",
        );
        assertThat(
          await listPendingSeasonRecentPremiereTimeUpdatingTasks(
            SPANNER_DATABASE,
            {
              seasonRecentPremiereTimeUpdatingTaskExecutionTimeMsLe: 1000000,
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
            insertSeasonRecentPremiereTimeUpdatingTaskStatement({
              seasonId: "season1",
              episodeId: "episode1",
              retryCount: 0,
              executionTimeMs: 1000,
            }),
          ]);
          await transaction.commit();
        });
        let handler = new ProcessSeasonRecentPremiereTimeUpdatingTaskHandler(
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
          await getSeasonRecentPremiereTimeUpdatingTask(SPANNER_DATABASE, {
            seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: "season1",
            seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: "episode1",
          }),
          isArray([
            eqMessage(
              {
                seasonRecentPremiereTimeUpdatingTaskRetryCount: 1,
                seasonRecentPremiereTimeUpdatingTaskExecutionTimeMs: 301000,
              },
              GET_SEASON_RECENT_PREMIERE_TIME_UPDATING_TASK_METADATA_ROW,
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
