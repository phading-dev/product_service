import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_SEASON_FLAG_REPORT_ROW,
  deleteSeasonFlagReportStatement,
  getSeasonFlagReport,
} from "../../../db/sql";
import { FlagSeasonHandler } from "./flag_season_handler";
import { SeasonFlagReason } from "@phading/product_service_interface/show/season_flag_reason";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "FlagSeasonHandlerTest",
  cases: [
    {
      name: "Success",
      execute: async () => {
        // Prepare
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new FlagSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          {
            send: () => {},
          } as any,
          () => 1000,
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            reason: SeasonFlagReason.HARASSMENT,
            comment: "This is a test comment.",
          },
          "session1",
        );

        // Verify
        assertThat(
          await getSeasonFlagReport(SPANNER_DATABASE, {
            seasonFlagReportReporterIdEq: "account1",
            seasonFlagReportSeasonIdEq: "season1",
          }),
          isArray([
            eqMessage(
              {
                seasonFlagReportReporterId: "account1",
                seasonFlagReportSeasonId: "season1",
                seasonFlagReportReason: SeasonFlagReason.HARASSMENT,
                seasonFlagReportComment: "This is a test comment.",
                seasonFlagReportFlagTimeMs: 1000,
              },
              GET_SEASON_FLAG_REPORT_ROW,
            ),
          ]),
          "report",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonFlagReportStatement({
              seasonFlagReportReporterIdEq: "account1",
              seasonFlagReportSeasonIdEq: "season1",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
