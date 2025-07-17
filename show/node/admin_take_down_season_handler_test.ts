import "../../local/env";
import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  GET_SEASON_ROW,
  deleteSeasonStatement,
  getSeason,
  insertSeasonStatement,
} from "../../db/sql";
import { AdminTakeDownSeasonHandler } from "./admin_take_down_season_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "AdminTakeDownSeasonHandlerTest",
  cases: [
    {
      name: "Success",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              state: SeasonState.PUBLISHED,
              createdTimeMs: 100,
            }),
          ]);
          await transaction.commit();
        });
        let handler = new AdminTakeDownSeasonHandler(SPANNER_DATABASE);

        // Execute
        await handler.handle("", {
          seasonId: "season1",
          reason: "Inappropriate content",
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
                seasonState: SeasonState.TAKEN_DOWN,
                seasonTakenDownReason: "Inappropriate content",
                seasonCreatedTimeMs: 100,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "season",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({
              seasonSeasonIdEq: "season1",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
