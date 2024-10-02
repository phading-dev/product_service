import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  getLastTwoSeasonGrade,
  getSeasonDetails,
} from "../../../db/sql";
import { CreateSeasonHandler } from "./create_season_handler";
import { CREATE_SEASON_RESPONSE } from "@phading/product_service_interface/publisher/show/frontend/interface";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/backend/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat, eq, lt } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

async function cleanupSeason(): Promise<void> {
  try {
    await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([deleteSeasonStatement("season1")]);
      await transaction.commit();
    });
  } catch (e) {}
}

TEST_RUNNER.run({
  name: "CreateSessionHandler",
  cases: [
    {
      name: "Default",
      execute: async () => {
        // Prepare
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new CreateSeasonHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 1000,
          () => "season1",
        );

        // Execute
        let response = await handler.handle("", { name: "a name" }, "session1");

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              seasonId: "season1",
            },
            CREATE_SEASON_RESPONSE,
          ),
          "response",
        );
        let details = (
          await getSeasonDetails(SPANNER_DATABASE, "season1", "account1")
        )[0];
        assertThat(details.seasonName, eq("a name"), "season name");
        assertThat(details.seasonState, eq(SeasonState.DRAFT), "season state");
        let grades = await getLastTwoSeasonGrade(
          SPANNER_DATABASE,
          "season1",
          Date.now(),
        );
        assertThat(grades.length, eq(1), "only 1 grade");
        assertThat(grades[0].seasonGradeGrade, eq(1), "grade");
        assertThat(
          grades[0].seasonGradeStartTimestamp,
          lt(Date.now()),
          "start timestamp",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
  ],
});
