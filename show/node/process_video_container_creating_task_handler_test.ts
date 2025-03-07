import "../../local/env";
import { SPANNER_DATABASE } from "../../common/spanner_database";
import { Episode } from "../../db/schema";
import {
  GET_EPISODE_ROW,
  GET_VIDEO_CONTAINER_CREATING_TASK_METADATA_ROW,
  GET_VIDEO_CONTAINER_DELETING_TASK_ROW,
  checkPresenceOfVideoContainerKey,
  deleteSeasonStatement,
  deleteVideoContainerCreatingTaskStatement,
  deleteVideoContainerDeletingTaskStatement,
  deleteVideoContainerKeyStatement,
  getEpisode,
  getVideoContainerCreatingTaskMetadata,
  getVideoContainerDeletingTask,
  insertEpisodeStatement,
  insertSeasonStatement,
  insertVideoContainerCreatingTaskStatement,
  listPendingVideoContainerCreatingTasks,
  listPendingVideoContainerDeletingTasks,
} from "../../db/sql";
import { ProcessVideoContainerCreatingTaskHandler } from "./process_video_container_creating_task_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import {
  CREATE_VIDEO_CONTAINER,
  CREATE_VIDEO_CONTAINER_REQUEST_BODY,
} from "@phading/video_service_interface/node/interface";
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

async function insertEpisode(episode: Episode) {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    await transaction.batchUpdate([
      insertSeasonStatement({
        seasonId: episode.seasonId,
        publisherId: "publisher1",
        state: SeasonState.DRAFT,
        lastChangeTimeMs: 100,
        recentPublishTimeMs: 100,
      }),
      insertEpisodeStatement(episode),
      insertVideoContainerCreatingTaskStatement(
        episode.seasonId,
        episode.episodeId,
        0,
        100,
        0,
      ),
    ]);
    await transaction.commit();
  });
}

async function cleanupAll() {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    await transaction.batchUpdate([
      deleteSeasonStatement("season1"),
      deleteVideoContainerCreatingTaskStatement("season1", "episode1"),
      deleteVideoContainerKeyStatement("showcontainer1"),
      deleteVideoContainerDeletingTaskStatement("showcontainer1"),
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
        let episode: Episode = {
          seasonId: "season1",
          episodeId: "episode1",
          index: 1,
          publishTimeMs: 200,
        };
        await insertEpisode(episode);
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
            await checkPresenceOfVideoContainerKey(
              SPANNER_DATABASE,
              "showcontainer1",
            )
          ).length,
          eq(1),
          "videoContainerKey",
        );
        assertThat(
          await getVideoContainerDeletingTask(
            SPANNER_DATABASE,
            "showcontainer1",
          ),
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
        episode.videoContainerId = "showcontainer1";
        assertThat(
          await getEpisode(SPANNER_DATABASE, "season1", "episode1"),
          isArray([
            eqMessage(
              {
                episodeData: episode,
              },
              GET_EPISODE_ROW,
            ),
          ]),
          "episode",
        );
        assertThat(
          await listPendingVideoContainerCreatingTasks(
            SPANNER_DATABASE,
            TWO_YEAR_MS,
          ),
          isArray([]),
          "creating tasks 2",
        );
        assertThat(
          await listPendingVideoContainerDeletingTasks(
            SPANNER_DATABASE,
            TWO_YEAR_MS,
          ),
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
        let episode: Episode = {
          seasonId: "season1",
          episodeId: "episode1",
          index: 1,
          publishTimeMs: 200,
        };
        await insertEpisode(episode);
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
          await getEpisode(SPANNER_DATABASE, "season1", "episode1"),
          isArray([
            eqMessage(
              {
                episodeData: episode,
              },
              GET_EPISODE_ROW,
            ),
          ]),
          "episode",
        );
        assertThat(
          await getVideoContainerDeletingTask(
            SPANNER_DATABASE,
            "showcontainer1",
          ),
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
      name: "ClaimTask",
      execute: async () => {
        // Prepare
        let episode: Episode = {
          seasonId: "season1",
          episodeId: "episode1",
          index: 1,
          publishTimeMs: 200,
        };
        await insertEpisode(episode);
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
          await getVideoContainerCreatingTaskMetadata(
            SPANNER_DATABASE,
            "season1",
            "episode1",
          ),
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
