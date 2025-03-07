import "../../local/env";
import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertSeasonGradeStatement,
  insertSeasonStatement,
} from "../../db/sql";
import { GetSeasonGradeHandler } from "./get_season_grade_handler";
import { GET_SEASON_GRADE_RESPONSE } from "@phading/product_service_interface/show/node/interface";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import {
  newInternalServerErrorError,
  newNotFoundError,
} from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertReject, assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "GetSeasonGradeHandlerTest",
  cases: [
    {
      name: "GetSeasonGrade",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              lastChangeTimeMs: 100,
              recentPublishTimeMs: 100,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "2021-01-01",
              endDate: "2022-01-01",
              grade: 24,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade2",
              startDate: "2020-01-01",
              endDate: "2021-01-01",
              grade: 23,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade3",
              startDate: "2019-01-01",
              endDate: "2020-01-01",
              grade: 25,
            }),
          ]);
          await transaction.commit();
        });
        let handler = new GetSeasonGradeHandler(SPANNER_DATABASE);

        {
          // Execute
          let response = await handler.handle("", {
            seasonId: "season1",
            date: "2020-01-01",
          });

          // Verify
          assertThat(
            response,
            eqMessage(
              {
                grade: 23,
              },
              GET_SEASON_GRADE_RESPONSE,
            ),
            "response 01",
          );
        }

        {
          // Execute
          let response = await handler.handle("", {
            seasonId: "season1",
            date: "2020-07-01",
          });

          // Verify
          assertThat(
            response,
            eqMessage(
              {
                grade: 23,
              },
              GET_SEASON_GRADE_RESPONSE,
            ),
            "response 07",
          );
        }

        {
          // Execute
          let response = await handler.handle("", {
            seasonId: "season1",
            date: "2020-12-31",
          });

          // Verify
          assertThat(
            response,
            eqMessage(
              {
                grade: 23,
              },
              GET_SEASON_GRADE_RESPONSE,
            ),
            "response 12",
          );
        }

        {
          // Execute
          let error = await assertReject(
            handler.handle("", {
              seasonId: "season1",
              date: "2022-01-01",
            }),
          );

          // Verify
          assertThat(
            error,
            eqHttpError(
              newNotFoundError(
                "Grade of season season1 for date 2022-01-01 is not found",
              ),
            ),
            "error",
          );
        }
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([deleteSeasonStatement("season1")]);
          await transaction.commit();
        });
      },
    },
    {
      name: "MultipleSeasonGrades",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              lastChangeTimeMs: 100,
              recentPublishTimeMs: 100,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "2021-01-01",
              endDate: "2021-12-31",
              grade: 24,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade2",
              startDate: "2021-05-01",
              endDate: "2022-10-30",
              grade: 23,
            }),
          ]);
          await transaction.commit();
        });
        let handler = new GetSeasonGradeHandler(SPANNER_DATABASE);

        // Execute
        let error = await assertReject(
          handler.handle("", {
            seasonId: "season1",
            date: "2021-10-01",
          }),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newInternalServerErrorError(
              "Multiple grades of season season1 for date 2021-10-01 are found.",
            ),
          ),
          "error",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([deleteSeasonStatement("season1")]);
          await transaction.commit();
        });
      },
    },
  ],
});
