import { SPANNER_DATABASE } from "../../common/spanner_database";
import { Episode } from "../../db/schema";
import {
  GET_EPISODE_ROW,
  LIST_VIDEO_CONTAINER_CREATING_TASKS_ROW,
  LIST_VIDEO_CONTAINER_DELETING_TASKS_ROW,
  checkPresenceOfVideoContainerKey,
  deleteSeasonStatement,
  deleteVideoContainerCreatingTaskStatement,
  deleteVideoContainerDeletingTaskStatement,
  deleteVideoContainerKeyStatement,
  getEpisode,
  insertEpisodeStatement,
  insertSeasonStatement,
  insertVideoContainerCreatingTaskStatement,
  listVideoContainerCreatingTasks,
  listVideoContainerDeletingTasks,
} from "../../db/sql";
import { ProcessVideoContainerCreatingTaskHandler } from "./process_video_container_creating_task_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import {
  CREATE_VIDEO_CONTAINER,
  CREATE_VIDEO_CONTAINER_REQUEST_BODY,
} from "@phading/video_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat, eq, isArray } from "@selfage/test_matcher";
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
      }),
      insertEpisodeStatement(episode),
      insertVideoContainerCreatingTaskStatement(
        episode.seasonId,
        episode.episodeId,
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
      name: "Success",
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
        let handler = new ProcessVideoContainerCreatingTaskHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => "container1",
          () => 1000,
        );
        let delayResolveFn: () => void;
        let firstEncounterPromise = new Promise<void>((resolve1) => {
          handler.interfereFn = async () => {
            resolve1();
            await new Promise<void>((resolve2) => {
              delayResolveFn = resolve2;
            });
          };
        });

        // Execute
        handler.handle("", {
          seasonId: "season1",
          episodeId: "episode1",
        });
        await firstEncounterPromise;

        // Verify
        assertThat(
          await checkPresenceOfVideoContainerKey(
            SPANNER_DATABASE,
            "container1",
          ),
          isArray([]),
          "videoContainerKey",
        );
        assertThat(
          await listVideoContainerCreatingTasks(SPANNER_DATABASE, TWO_YEAR_MS),
          isArray([
            eqMessage(
              {
                videoContainerCreatingTaskSeasonId: "season1",
                videoContainerCreatingTaskEpisodeId: "episode1",
                videoContainerCreatingTaskExecutionTimeMs: 301000,
              },
              LIST_VIDEO_CONTAINER_CREATING_TASKS_ROW,
            ),
          ]),
          "creating tasks",
        );
        assertThat(
          await listVideoContainerDeletingTasks(SPANNER_DATABASE, TWO_YEAR_MS),
          isArray([
            eqMessage(
              {
                videoContainerDeletingTaskVideoContainerId: "showcontainer1",
                videoContainerDeletingTaskExecutionTimeMs: 1000 + ONE_YEAR_MS,
              },
              LIST_VIDEO_CONTAINER_DELETING_TASKS_ROW,
            ),
          ]),
          "deleting tasks",
        );

        // Execute
        delayResolveFn();
        await new Promise<void>((resolve) => (handler.doneCallback = resolve));

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
          await listVideoContainerCreatingTasks(SPANNER_DATABASE, TWO_YEAR_MS),
          isArray([]),
          "creating tasks 2",
        );
        assertThat(
          await listVideoContainerDeletingTasks(SPANNER_DATABASE, TWO_YEAR_MS),
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
        let handler = new ProcessVideoContainerCreatingTaskHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => "container1",
          () => 1000,
        );
        handler.interfereFn = async () => {
          throw new Error("Fake error");
        };

        // Execute
        handler.handle("", {
          seasonId: "season1",
          episodeId: "episode1",
        });
        await new Promise<void>((resolve) => (handler.doneCallback = resolve));

        // Verify
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
          await listVideoContainerCreatingTasks(SPANNER_DATABASE, TWO_YEAR_MS),
          isArray([
            eqMessage(
              {
                videoContainerCreatingTaskSeasonId: "season1",
                videoContainerCreatingTaskEpisodeId: "episode1",
                videoContainerCreatingTaskExecutionTimeMs: 301000,
              },
              LIST_VIDEO_CONTAINER_CREATING_TASKS_ROW,
            ),
          ]),
          "creating tasks",
        );
        assertThat(
          await listVideoContainerDeletingTasks(SPANNER_DATABASE, TWO_YEAR_MS),
          isArray([
            eqMessage(
              {
                videoContainerDeletingTaskVideoContainerId: "showcontainer1",
                videoContainerDeletingTaskExecutionTimeMs: 181000,
              },
              LIST_VIDEO_CONTAINER_DELETING_TASKS_ROW,
            ),
          ]),
          "deleting tasks",
        );
      },
      tearDown: async () => {
        await cleanupAll();
      },
    },
  ],
});
