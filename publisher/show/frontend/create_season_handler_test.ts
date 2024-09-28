import {
  deleteSeason,
  getLastTwoSeasonGrade,
  getSeasonDetails,
} from "../../../db/sql";
import { CreateSeasonHandler } from "./create_season_handler";
import { Spanner } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/backend/interface";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat, eq, lt } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

export let TEST_DATABASE = new Spanner({
  projectId: "local-project",
})
  .instance("test-instance")
  .database("test-database");

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
          TEST_DATABASE,
          clientMock,
          () => "season1",
        );

        // Execute
        await handler.handle("", { name: "a name" }, "session1");

        // Verify
        let details = (
          await getSeasonDetails(
            (query) => TEST_DATABASE.run(query),
            "season1",
            "account1",
          )
        )[0];
        assertThat(details.seasonName, eq("a name"), "season name");
        assertThat(details.seasonState, eq(SeasonState.DRAFT), "season state");
        let grades = await getLastTwoSeasonGrade(
          (query) => TEST_DATABASE.run(query),
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
        try {
          await TEST_DATABASE.runTransactionAsync(async (transaction) => {
            await deleteSeason((query) => transaction.run(query), "season1");
            await transaction.commit();
          });
        } catch (e) {}
      },
    },
  ],
});
