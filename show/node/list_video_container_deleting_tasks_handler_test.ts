import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  deleteVideoContainerDeletingTaskStatement,
  insertVideoContainerDeletingTaskStatement,
} from "../../db/sql";
import { ListVideoContainerDeletingTasksHandler } from "./list_video_container_deleting_tasks_handler";
import { LIST_VIDEO_CONTAINER_DELETING_TASKS_RESPONSE } from "@phading/product_service_interface/show/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "ListVideoContainerDeletingTasksHandlerTest",
  cases: [
    {
      name: "Default",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertVideoContainerDeletingTaskStatement("container1", 100, 0),
            insertVideoContainerDeletingTaskStatement("container2", 0, 0),
            insertVideoContainerDeletingTaskStatement("container3", 1000, 0),
          ]);
          await transaction.commit();
        });
        let handler = new ListVideoContainerDeletingTasksHandler(
          SPANNER_DATABASE,
          () => 100,
        );

        // Execute
        let response = await handler.handle("", {});

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              tasks: [
                {
                  videoContainerId: "container2",
                },
                {
                  videoContainerId: "container1",
                },
              ],
            },
            LIST_VIDEO_CONTAINER_DELETING_TASKS_RESPONSE,
          ),
          "response",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteVideoContainerDeletingTaskStatement("container1"),
            deleteVideoContainerDeletingTaskStatement("container2"),
            deleteVideoContainerDeletingTaskStatement("container3"),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
