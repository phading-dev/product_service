import {
  deleteSeason,
  getEpisodeDraft,
  getSeasonMetadata,
  insertEpisodeDraft,
  insertSeason,
} from "../../../db/sql";
import { UpdateEpisodeDraftHandler } from "./update_episode_draft_handler";
import { Spanner } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { VideoState } from "@phading/product_service_interface/publisher/show/video_state";
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
  name: "UpdateEpisodeDraftHandlerTest",
  cases: [
    {
      name: "EraseName",
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
          await insertEpisodeDraft(
            (query) => transaction.run(query),
            "season1",
            "ep1",
            "a name",
            "videofile",
            VideoState.EMPTY,
            {},
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
        let handler = new UpdateEpisodeDraftHandler(TEST_DATABASE, clientMock);

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "ep1",
          },
          "session1",
        );

        // Verify
        let draft = (
          await getEpisodeDraft(
            (query) => TEST_DATABASE.run(query),
            "season1",
            "ep1",
          )
        )[0];
        assertThat(draft.episodeDraftName, eq(undefined), "name");
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
        let handler = new UpdateEpisodeDraftHandler(TEST_DATABASE, clientMock);

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              episodeId: "ep1",
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
        let handler = new UpdateEpisodeDraftHandler(TEST_DATABASE, clientMock);

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              episodeId: "ep1",
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
