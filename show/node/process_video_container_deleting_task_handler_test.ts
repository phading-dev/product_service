import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  GET_VIDEO_CONTAINER_DELETING_TASK_METADATA_ROW,
  checkPresenceOfVideoContainerKey,
  deleteVideoContainerDeletingTaskStatement,
  deleteVideoContainerKeyStatement,
  getVideoContainerDeletingTaskMetadata,
  insertVideoContainerDeletingTaskStatement,
  insertVideoContainerKeyStatement,
  listPendingVideoContainerDeletingTasks,
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
      name: "ProcessTask",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertVideoContainerKeyStatement("showcontainer1"),
            insertVideoContainerDeletingTaskStatement(
              "showcontainer1",
              0,
              100,
              0,
            ),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        let handler = new ProcessVideoContainerDeletingTaskHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.processTask("", {
          videoContainerId: "showcontainer1",
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
          await listPendingVideoContainerDeletingTasks(
            SPANNER_DATABASE,
            1000000,
          ),
          isArray([]),
          "listVideoContainerDeletingTasks",
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
    {
      name: "ClaimTask",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertVideoContainerDeletingTaskStatement(
              "showcontainer1",
              0,
              100,
              0,
            ),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        let handler = new ProcessVideoContainerDeletingTaskHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.claimTask("", {
          videoContainerId: "showcontainer1",
        });

        // Verify
        assertThat(
          await getVideoContainerDeletingTaskMetadata(
            SPANNER_DATABASE,
            "showcontainer1",
          ),
          isArray([
            eqMessage(
              {
                videoContainerDeletingTaskRetryCount: 1,
                videoContainerDeletingTaskExecutionTimeMs: 301000,
              },
              GET_VIDEO_CONTAINER_DELETING_TASK_METADATA_ROW,
            ),
          ]),
          "getVideoContainerDeletingTaskMetadata",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteVideoContainerDeletingTaskStatement("showcontainer1"),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
