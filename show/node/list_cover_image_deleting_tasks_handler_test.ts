import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  deleteCoverImageDeletingTaskStatement,
  insertCoverImageDeletingTaskStatement,
} from "../../db/sql";
import { ListCoverImageDeletingTasksHandler } from "./list_cover_image_deleting_tasks_handler";
import { LIST_COVER_IMAGE_DELETING_TASKS_RESPONSE } from "@phading/product_service_interface/show/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "ListCoverImageDeletingTasksHandlerTest",
  cases: [
    {
      name: "Default",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertCoverImageDeletingTaskStatement("cover1.jpg", 100, 0),
            insertCoverImageDeletingTaskStatement("cover2.jpg", 0, 0),
            insertCoverImageDeletingTaskStatement("cover3.jpg", 1000, 0),
          ]);
          await transaction.commit();
        });
        let handler = new ListCoverImageDeletingTasksHandler(
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
                  r2Filename: "cover2.jpg",
                },
                {
                  r2Filename: "cover1.jpg",
                },
              ],
            },
            LIST_COVER_IMAGE_DELETING_TASKS_RESPONSE,
          ),
          "response",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteCoverImageDeletingTaskStatement("cover1.jpg"),
            deleteCoverImageDeletingTaskStatement("cover2.jpg"),
            deleteCoverImageDeletingTaskStatement("cover3.jpg"),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
