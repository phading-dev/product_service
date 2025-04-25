import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertSeasonGradeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { GetSeasonSummaryHandler } from "./get_season_summary_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { GET_SEASON_SUMMARY_RESPONSE } from "@phading/product_service_interface/show/web/consumer/interface";
import { newNotFoundError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertReject, assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "GetSeasonSummaryHandlerTest",
  cases: [
    {
      name: "Success",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              name: "Season 1",
              coverImageR2Filename: "image1",
              totalPublishedEpisodes: 25,
              averageRating: 4.5,
              ratingsCount: 99,
              createdTimeMs: 1000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 10,
            }),
          ]);
          await transaction.commit();
        });
        let handler = new GetSeasonSummaryHandler(
          SPANNER_DATABASE,
          "https://public_access_domain",
          () => new Date("2020-02-01T08:00:00.000Z"),
        );

        // Execute
        let response = await handler.handle("", { seasonId: "season1" });

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              seasonSummary: {
                seasonId: "season1",
                publisherId: "publisher1",
                name: "Season 1",
                coverImageUrl: "https://public_access_domain/image1",
                grade: 10,
                totalEpisodes: 25,
                averageRating: 4.5,
                ratingsCount: 99,
              },
            },
            GET_SEASON_SUMMARY_RESPONSE,
          ),
          "response",
        );
      },
      async tearDown() {
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
    {
      name: "SeasonNotPublished",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.DRAFT,
              name: "Season 1",
              coverImageR2Filename: "image1",
              totalPublishedEpisodes: 25,
              averageRating: 4.5,
              ratingsCount: 99,
              createdTimeMs: 1000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 10,
            }),
          ]);
          await transaction.commit();
        });
        let handler = new GetSeasonSummaryHandler(
          SPANNER_DATABASE,
          "https://public_access_domain",
          () => new Date("2020-02-01T08:00:00.000Z"),
        );

        // Execute
        let error = await assertReject(
          handler.handle("", { seasonId: "season1" }),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(newNotFoundError(`Season season1 is not found.`)),
          "error",
        );
      },
      async tearDown() {
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
