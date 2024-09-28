import {
  deleteSeason,
  getEpisodeDraft,
  getSeasonMetadata,
  insertSeason,
} from "../../../db/sql";
import { CreateEpisodeDraftHandler } from "./create_episode_draft_handler";
import { Spanner } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/backend/interface";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import {
  assertReject,
  assertThat,
  containStr,
  eq,
  ne,
} from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

let TEST_DATABASE = new Spanner({
  projectId: "local-project",
})
  .instance("test-instance")
  .database("test-database");

TEST_RUNNER.run({
  name: "CreateEpisodeDraftHandlerTest",
  cases: [
    {
      name: "WithoutName",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account1",
            "a name",
            "image.jpg",
            SeasonState.DRAFT,
            0,
          );
          await transaction.commit();
        });
        let prevTimestamps = (
          await getSeasonMetadata(
            (query) => TEST_DATABASE.run(query),
            "season1",
            "account1",
          )
        )[0].seasonLastChangeTimestamp;
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new CreateEpisodeDraftHandler(
          TEST_DATABASE,
          clientMock,
          () => "epid1",
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
          },
          "session1",
        );

        // Verify
        let draft = (
          await getEpisodeDraft(
            (query) => TEST_DATABASE.run(query),
            "season1",
            "epid1",
          )
        )[0];
        assertThat(draft.episodeDraftName, eq(undefined), "ep name");
        assertThat(
          draft.episodeDraftVideoFilename,
          eq("epid1"),
          "video filename",
        );
        let lastChangeTimestamp = (
          await getSeasonMetadata(
            (query) => TEST_DATABASE.run(query),
            "season1",
            "account1",
          )
        )[0].seasonLastChangeTimestamp;
        assertThat(
          lastChangeTimestamp,
          ne(prevTimestamps),
          "last change timestamp",
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
      name: "WithName",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account1",
            "a name",
            "image.jpg",
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
        let handler = new CreateEpisodeDraftHandler(
          TEST_DATABASE,
          clientMock,
          () => "epid1",
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeName: "ep name",
          },
          "session1",
        );

        // Verify
        let draft = (
          await getEpisodeDraft(
            (query) => TEST_DATABASE.run(query),
            "season1",
            "epid1",
          )
        )[0];
        assertThat(draft.episodeDraftName, eq("ep name"), "ep name");
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
      name: "SeasonNotOwned",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account2",
            "a name",
            "image.jpg",
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
        let handler = new CreateEpisodeDraftHandler(
          TEST_DATABASE,
          clientMock,
          () => "epid1",
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr("Season season1 is not found."),
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
      name: "SeasonArchived",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account1",
            "a name",
            "image.jpg",
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
        let handler = new CreateEpisodeDraftHandler(
          TEST_DATABASE,
          clientMock,
          () => "epid1",
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
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
