import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  deleteVideoContainerCreatingTaskStatement,
  insertVideoContainerCreatingTaskStatement,
} from "../../db/sql";
import { ListVideoContainerCreatingTasksHandler } from "./list_video_container_creating_tasks_handler";
import { LIST_VIDEO_CONTAINER_CREATING_TASKS_RESPONSE } from "@phading/product_service_interface/show/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "ListVideoContainerCreatingTasksHandlerTest",
  cases: [
    {
      name: "Default",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertVideoContainerCreatingTaskStatement(
              "season1",
              "episode1",
              100,
              0,
            ),
            insertVideoContainerCreatingTaskStatement(
              "season1",
              "episode2",
              0,
              0,
            ),
            insertVideoContainerCreatingTaskStatement(
              "season1",
              "episode3",
              1000,
              0,
            ),
          ]);
          await transaction.commit();
        });
        let handler = new ListVideoContainerCreatingTasksHandler(
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
                  seasonId: "season1",
                  episodeId: "episode2",
                },
                {
                  seasonId: "season1",
                  episodeId: "episode1",
                },
              ],
            },
            LIST_VIDEO_CONTAINER_CREATING_TASKS_RESPONSE,
          ),
          "response",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteVideoContainerCreatingTaskStatement("season1", "episode1"),
            deleteVideoContainerCreatingTaskStatement("season1", "episode2"),
            deleteVideoContainerCreatingTaskStatement("season1", "episode3"),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
