import { deleteSeason, getSeasonDetails, insertSeason } from "../../../db/sql";
import { UpdateSeasonHandler } from "./update_season_handler";
import { Spanner } from "@google-cloud/spanner";
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

let TEST_DATABASE = new Spanner({
  projectId: "local-project",
})
  .instance("test-instance")
  .database("test-database");

TEST_RUNNER.run({
  name: "UpdateSeasonHandlerTest",
  cases: [
    {
      name: "NoDescription",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account1",
            "a name",
            "file.jpg",
            SeasonState.DRAFT,
            0,
          );
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateSeasonHandler(TEST_DATABASE, clientMock);

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
          await getSeasonDetails(
            (query) => TEST_DATABASE.run(query),
            "season1",
            "account1",
          )
        )[0];
        assertThat(details.seasonName, eq("another name"), "name");
        assertThat(details.seasonDescription, eq(undefined), "description");
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
    {
      name: "WithDescription",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account1",
            "a name",
            "file.jpg",
            SeasonState.DRAFT,
            0,
          );
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateSeasonHandler(TEST_DATABASE, clientMock);

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
          await getSeasonDetails(
            (query) => TEST_DATABASE.run(query),
            "season1",
            "account1",
          )
        )[0];
        assertThat(details.seasonName, eq("another name"), "name");
        assertThat(
          details.seasonDescription,
          eq("a new description"),
          "description",
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
    {
      name: "SeasonNotOwnedByAccount",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account2",
            "a name",
            "file.jpg",
            SeasonState.DRAFT,
            0,
          );
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateSeasonHandler(TEST_DATABASE, clientMock);

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
        try {
          await TEST_DATABASE.runTransactionAsync(async (transaction) => {
            await deleteSeason((query) => transaction.run(query), "season1");
            await transaction.commit();
          });
        } catch (e) {}
      },
    },
    {
      name: "ArchivedSeason",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account1",
            "a name",
            "file.jpg",
            SeasonState.ARCHIVED,
            0,
          );
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateSeasonHandler(TEST_DATABASE, clientMock);

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
