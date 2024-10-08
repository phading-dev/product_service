import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  getSeasonDetails,
  insertSeasonStatement,
} from "../../../db/sql";
import { UpdateSeasonHandler } from "./update_season_handler";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/backend/interface";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import {
  assertReject,
  assertThat,
  containStr,
  eq,
} from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

async function cleanupSeason(): Promise<void> {
  try {
    await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
      await transaction.runUpdate(deleteSeasonStatement("season1"));
      await transaction.commit();
    });
  } catch (e) {}
}

TEST_RUNNER.run({
  name: "UpdateSeasonHandlerTest",
  cases: [
    {
      name: "NoDescription",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "file.jpg",
              1000,
              1000,
              SeasonState.DRAFT,
              0,
            ),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let nowTimestamp = 2000;
        let handler = new UpdateSeasonHandler(
          SPANNER_DATABASE,
          clientMock,
          () => nowTimestamp,
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            name: "another name",
          },
          "session1",
        );

        // Verify
        let details = (
          await getSeasonDetails(SPANNER_DATABASE, "season1", "account1")
        )[0];
        assertThat(details.seasonName, eq("another name"), "name");
        assertThat(details.seasonDescription, eq(undefined), "description");
        assertThat(
          details.seasonLastChangeTimestamp,
          eq(nowTimestamp),
          "last change timestamp",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "WithDescription",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "file.jpg",
              1000,
              1000,
              SeasonState.DRAFT,
              0,
            ),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let nowTimestamp = 2000;
        let handler = new UpdateSeasonHandler(
          SPANNER_DATABASE,
          clientMock,
          () => nowTimestamp,
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            name: "another name",
            description: "a new description",
          },
          "session1",
        );

        // Verify
        let details = (
          await getSeasonDetails(SPANNER_DATABASE, "season1", "account1")
        )[0];
        assertThat(details.seasonName, eq("another name"), "name");
        assertThat(
          details.seasonDescription,
          eq("a new description"),
          "description",
        );
        assertThat(
          details.seasonLastChangeTimestamp,
          eq(nowTimestamp),
          "last change timestamp",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "SeasonNotOwnedByAccount",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "file.jpg",
              1000,
              1000,
              SeasonState.DRAFT,
              0,
            ),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account2",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateSeasonHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 2000,
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              name: "another name",
              description: "a new description",
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr("Season season1 is not found"),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "ArchivedSeason",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "file.jpg",
              1000,
              1000,
              SeasonState.ARCHIVED,
              0,
            ),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateSeasonHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 2000,
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              name: "another name",
              description: "a new description",
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr("Season season1 is archived"),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
  ],
});
