import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  LIST_VIDEO_CONTAINER_DELETING_TASKS_ROW,
  checkPresenceOfVideoContainerKey,
  deleteVideoContainerDeletingTaskStatement,
  deleteVideoContainerKeyStatement,
  insertVideoContainerDeletingTaskStatement,
  insertVideoContainerKeyStatement,
  listVideoContainerDeletingTasks,
} from "../../db/sql";
import { ProcessVideoContainerDeletingTaskHandler } from "./process_video_container_deleting_task_handler";
import {
  DELETE_VIDEO_CONTAINER,
  DELETE_VIDEO_CONTAINER_REQUEST_BODY,
} from "@phading/video_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat, eq, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "ProcessVideoContainerDeletingTaskHandlerTest",
  cases: [
    {
      name: "Success",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertVideoContainerKeyStatement("showcontainer1"),
            insertVideoContainerDeletingTaskStatement("showcontainer1", 100, 0),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        let handler = new ProcessVideoContainerDeletingTaskHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );
        let delayResolveFn: () => void = () => {};
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
          videoContainerId: "showcontainer1",
        });
        await firstEncounterPromise;

        // Verify
        assertThat(
          await listVideoContainerDeletingTasks(SPANNER_DATABASE, 1000000),
          isArray([
            eqMessage(
              {
                videoContainerDeletingTaskVideoContainerId: "showcontainer1",
                videoContainerDeletingTaskExecutionTimeMs: 301000,
              },
              LIST_VIDEO_CONTAINER_DELETING_TASKS_ROW,
            ),
          ]),
          "listVideoContainerDeletingTasks",
        );

        // Execute
        delayResolveFn();
        await new Promise<void>((resolve) => {
          handler.doneCallback = resolve;
        });

        // Verify
        assertThat(
          serviceClientMock.request.descriptor,
          eq(DELETE_VIDEO_CONTAINER),
          "RC",
        );
        assertThat(
          serviceClientMock.request.body,
          eqMessage(
            {
              containerId: "showcontainer1",
            },
            DELETE_VIDEO_CONTAINER_REQUEST_BODY,
          ),
          "RC body",
        );
        assertThat(
          await checkPresenceOfVideoContainerKey(
            SPANNER_DATABASE,
            "showcontainer1",
          ),
          isArray([]),
          "checkPresenceOfVideoContainerKey",
        );
        assertThat(
          await listVideoContainerDeletingTasks(SPANNER_DATABASE, 1000000),
          isArray([]),
          "listVideoContainerDeletingTasks 2",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteVideoContainerKeyStatement("showcontainer1"),
            deleteVideoContainerDeletingTaskStatement("showcontainer1"),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
