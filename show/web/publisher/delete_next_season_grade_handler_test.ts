import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_LAST_SEASON_GRADES_ROW,
  GET_SEASON_ROW,
  deleteSeasonStatement,
  getLastSeasonGrades,
  getSeason,
  insertSeasonGradeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { DeleteNextSeasonGradeHandler } from "./delete_next_season_grade_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { newBadRequestError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "DeleteNextSeasonGradeHandlerTest",
  cases: [
    {
      name: "Success",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              createdTimeMs: 1000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "1900-01-01",
              endDate: "2010-01-01",
              grade: 1,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade2",
              startDate: "2010-01-01",
              endDate: "2020-02-01",
              grade: 3,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade3",
              startDate: "2020-02-01",
              endDate: "9999-12-31",
              grade: 5,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublish: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new DeleteNextSeasonGradeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => new Date("2020-01-01T08:00:00Z"),
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          await getSeason(SPANNER_DATABASE, { seasonSeasonIdEq: "season1" }),
          isArray([
            eqMessage(
              {
                seasonSeasonId: "season1",
                seasonPublisherId: "publisher1",
                seasonState: SeasonState.PUBLISHED,
                seasonLastChangeTimeMs: new Date(
                  "2020-01-01T08:00:00Z",
                ).getTime(),
                seasonCreatedTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "Season",
        );
        assertThat(
          await getLastSeasonGrades(SPANNER_DATABASE, {
            seasonGradeSeasonIdEq: "season1",
            seasonGradeEndDateGt: "2020-01-01",
            limit: 2,
          }),
          isArray([
            eqMessage(
              {
                seasonGradeSeasonId: "season1",
                seasonGradeGradeId: "grade2",
                seasonGradeStartDate: "2010-01-01",
                seasonGradeEndDate: "9999-12-31",
                seasonGradeGrade: 3,
              },
              GET_LAST_SEASON_GRADES_ROW,
            ),
          ]),
          "SeasonGrades",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "NoNextGradeToDelete",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              createdTimeMs: 1000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "1900-01-01",
              endDate: "9999-12-31",
              grade: 3,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublish: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new DeleteNextSeasonGradeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => new Date("2020-01-01T08:00:00Z"),
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
            },
            "sessionStr",
          ),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newBadRequestError(
              `Season season1 doesn't have next grade to delete.`,
            ),
          ),
          "Error",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "SeasonArchived",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.ARCHIVED,
              createdTimeMs: 1000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "1900-01-01",
              endDate: "2020-02-01",
              grade: 3,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade2",
              startDate: "2020-02-01",
              endDate: "9999-12-31",
              grade: 5,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublish: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new DeleteNextSeasonGradeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => new Date(1577908800000), // 2020-01-01T08:00:00Z
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
            },
            "sessionStr",
          ),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newBadRequestError(
              `Season season1 is not in PUBLISHED state and cannot delete next season grade.`,
            ),
          ),
          "Error",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
