import "../../local/env";
import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  GET_EPISODE_ROW,
  GET_VIDEO_CONTAINER_CREATING_TASK_METADATA_ROW,
  GET_VIDEO_CONTAINER_DELETING_TASK_ROW,
  deleteSeasonStatement,
  deleteVideoContainerCreatingTaskStatement,
  deleteVideoContainerDeletingTaskStatement,
  deleteVideoContainerKeyStatement,
  getEpisode,
  getVideoContainerCreatingTaskMetadata,
  getVideoContainerDeletingTask,
  getVideoContainerKey,
  insertEpisodeStatement,
  insertSeasonStatement,
  insertVideoContainerCreatingTaskStatement,
  listPendingVideoContainerCreatingTasks,
  listPendingVideoContainerDeletingTasks,
} from "../../db/sql";
import { ProcessVideoContainerCreatingTaskHandler } from "./process_video_container_creating_task_handler";
import {
  CREATE_VIDEO_CONTAINER,
  CREATE_VIDEO_CONTAINER_REQUEST_BODY,
} from "@phading/video_service_interface/node/interface";
import { newConflictError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import {
  assertReject,
  assertThat,
  eq,
  eqError,
  isArray,
} from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

let TWO_YEAR_MS = 2 * 365 * 24 * 60 * 60 * 1000;
let ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

async function insertEpisode(episode: {
  seasonId: string;
  episodeId: string;
  videoContainerId?: string;
}) {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    await transaction.batchUpdate([
      insertSeasonStatement({
        seasonId: episode.seasonId,
        publisherId: "publisher1",
      }),
      insertEpisodeStatement(episode),
      insertVideoContainerCreatingTaskStatement({
        seasonId: episode.seasonId,
        episodeId: episode.episodeId,
        retryCount: 0,
        executionTimeMs: 100,
      }),
    ]);
    await transaction.commit();
  });
}

async function cleanupAll() {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    await transaction.batchUpdate([
      deleteSeasonStatement({
        seasonSeasonIdEq: "season1",
      }),
      deleteVideoContainerCreatingTaskStatement({
        videoContainerCreatingTaskSeasonIdEq: "season1",
        videoContainerCreatingTaskEpisodeIdEq: "episode1",
      }),
      deleteVideoContainerKeyStatement({
        videoContainerKeyKeyEq: "showcontainer1",
      }),
      deleteVideoContainerDeletingTaskStatement({
        videoContainerDeletingTaskVideoContainerIdEq: "showcontainer1",
      }),
    ]);
    await transaction.commit();
  });
}

TEST_RUNNER.run({
  name: "ProcessVideoContainerCreatingTaskHandlerTest",
  cases: [
    {
      name: "ProcessTask",
      execute: async () => {
        // Prepare
        await insertEpisode({
          seasonId: "season1",
          episodeId: "episode1",
        });
        let delayResolveFn: () => void;
        let firstEncounterResolveFn: () => void;
        let firstEncounterPromise = new Promise<void>(
          (resolve) => (firstEncounterResolveFn = resolve),
        );
        let serviceClientMock = new (class extends NodeServiceClientMock {
          public async send(request: any): Promise<any> {
            this.request = request;
            firstEncounterResolveFn();
            await new Promise<void>((resolve) => (delayResolveFn = resolve));
          }
        })();
        let handler = new ProcessVideoContainerCreatingTaskHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => "container1",
          () => 1000,
        );

        // Execute
        let processedPromise = handler.processTask("", {
          seasonId: "season1",
          episodeId: "episode1",
        });
        await firstEncounterPromise;

        // Verify
        assertThat(
          (
            await getVideoContainerKey(SPANNER_DATABASE, {
              videoContainerKeyKeyEq: "showcontainer1",
            })
          ).length,
          eq(1),
          "videoContainerKey",
        );
        assertThat(
          await getVideoContainerDeletingTask(SPANNER_DATABASE, {
            videoContainerDeletingTaskVideoContainerIdEq: "showcontainer1",
          }),
          isArray([
            eqMessage(
              {
                videoContainerDeletingTaskVideoContainerId: "showcontainer1",
                videoContainerDeletingTaskRetryCount: 0,
                videoContainerDeletingTaskExecutionTimeMs: 1000 + ONE_YEAR_MS,
                videoContainerDeletingTaskCreatedTimeMs: 1000,
              },
              GET_VIDEO_CONTAINER_DELETING_TASK_ROW,
            ),
          ]),
          "deleting tasks",
        );

        // Execute
        delayResolveFn();
        await processedPromise;

        // Verify
        assertThat(
          serviceClientMock.request.descriptor,
          eq(CREATE_VIDEO_CONTAINER),
          "RC",
        );
        assertThat(
          serviceClientMock.request.body,
          eqMessage(
            {
              seasonId: "season1",
              episodeId: "episode1",
              accountId: "publisher1",
              videoContainerId: "showcontainer1",
            },
            CREATE_VIDEO_CONTAINER_REQUEST_BODY,
          ),
          "RC body",
        );
        assertThat(
          await getEpisode(SPANNER_DATABASE, {
            episodeSeasonIdEq: "season1",
            episodeEpisodeIdEq: "episode1",
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode1",
                episodeVideoContainerId: "showcontainer1",
              },
              GET_EPISODE_ROW,
            ),
          ]),
          "episode",
        );
        assertThat(
          await listPendingVideoContainerCreatingTasks(SPANNER_DATABASE, {
            videoContainerCreatingTaskExecutionTimeMsLe: TWO_YEAR_MS,
          }),
          isArray([]),
          "creating tasks 2",
        );
        assertThat(
          await listPendingVideoContainerDeletingTasks(SPANNER_DATABASE, {
            videoContainerDeletingTaskExecutionTimeMsLe: TWO_YEAR_MS,
          }),
          isArray([]),
          "deleting tasks 2",
        );
      },
      tearDown: async () => {
        await cleanupAll();
      },
    },
    {
      name: "InterferredFailure",
      execute: async () => {
        // Prepare
        await insertEpisode({
          seasonId: "season1",
          episodeId: "episode1",
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.error = new Error("Fake error");
        let handler = new ProcessVideoContainerCreatingTaskHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => "container1",
          () => 1000,
        );

        // Execute
        let error = await assertReject(
          handler.processTask("", {
            seasonId: "season1",
            episodeId: "episode1",
          }),
        );

        // Verify
        assertThat(error, eqError(new Error("Fake error")), "error");
        assertThat(
          await getEpisode(SPANNER_DATABASE, {
            episodeSeasonIdEq: "season1",
            episodeEpisodeIdEq: "episode1",
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode1",
              },
              GET_EPISODE_ROW,
            ),
          ]),
          "episode",
        );
        assertThat(
          await getVideoContainerDeletingTask(SPANNER_DATABASE, {
            videoContainerDeletingTaskVideoContainerIdEq: "showcontainer1",
          }),
          isArray([
            eqMessage(
              {
                videoContainerDeletingTaskVideoContainerId: "showcontainer1",
                videoContainerDeletingTaskRetryCount: 0,
                videoContainerDeletingTaskExecutionTimeMs: 301000,
                videoContainerDeletingTaskCreatedTimeMs: 1000,
              },
              GET_VIDEO_CONTAINER_DELETING_TASK_ROW,
            ),
          ]),
          "deleting tasks",
        );
      },
      tearDown: async () => {
        await cleanupAll();
      },
    },
    {
      name: "VideoContainerAlreadyCreated",
      execute: async () => {
        // Prepare
        await insertEpisode({
          seasonId: "season1",
          episodeId: "episode1",
          videoContainerId: "showcontainer1",
        });
        let handler = new ProcessVideoContainerCreatingTaskHandler(
          SPANNER_DATABASE,
          undefined,
          () => "container2",
          () => 1000,
        );

        // Execute
        let error = await assertReject(
          handler.processTask("", {
            seasonId: "season1",
            episodeId: "episode1",
          }),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newConflictError(
              "Video container for season season1 episode episode1 is already created.",
            ),
          ),
          "error",
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
        await insertEpisode({
          seasonId: "season1",
          episodeId: "episode1",
        });
        let handler = new ProcessVideoContainerCreatingTaskHandler(
          SPANNER_DATABASE,
          undefined,
          undefined,
          () => 1000,
        );

        // Execute
        await handler.claimTask("", {
          seasonId: "season1",
          episodeId: "episode1",
        });

        // Verify
        assertThat(
          await getVideoContainerCreatingTaskMetadata(SPANNER_DATABASE, {
            videoContainerCreatingTaskSeasonIdEq: "season1",
            videoContainerCreatingTaskEpisodeIdEq: "episode1",
          }),
          isArray([
            eqMessage(
              {
                videoContainerCreatingTaskRetryCount: 1,
                videoContainerCreatingTaskExecutionTimeMs: 301000,
              },
              GET_VIDEO_CONTAINER_CREATING_TASK_METADATA_ROW,
            ),
          ]),
          "videoContainerCreatingTask",
        );
      },
      tearDown: async () => {
        await cleanupAll();
      },
    },
  ],
});
