import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  getEpisodeDraft,
  getSeasonMetadata,
  insertEpisodeDraftStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { UpdateEpisodeDraftHandler } from "./update_episode_draft_handler";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { VideoState } from "@phading/product_service_interface/publisher/show/video_state";
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
      await transaction.batchUpdate([deleteSeasonStatement("season1")]);
      await transaction.commit();
    });
  } catch (e) {}
}

TEST_RUNNER.run({
  name: "UpdateEpisodeDraftHandlerTest",
  cases: [
    {
      name: "EraseName",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "image.jpg",
              1000,
              1000,
              SeasonState.DRAFT,
              0,
            ),
            insertEpisodeDraftStatement(
              "season1",
              "ep1",
              "a name",
              "videofile",
              VideoState.INCOMPLETE,
              {},
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
        let handler = new UpdateEpisodeDraftHandler(
          SPANNER_DATABASE,
          clientMock,
          () => nowTimestamp,
        );

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
          await getEpisodeDraft(SPANNER_DATABASE, "season1", "ep1")
        )[0];
        assertThat(draft.episodeDraftName, eq(undefined), "name");
        let lastChangeTimestamp = (
          await getSeasonMetadata(SPANNER_DATABASE, "season1", "account1")
        )[0].seasonLastChangeTimestamp;
        assertThat(
          lastChangeTimestamp,
          eq(nowTimestamp),
          "last change timestamp",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "SeasonNotOwned",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "image.jpg",
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
        let handler = new UpdateEpisodeDraftHandler(
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
        await cleanupSeason();
      },
    },
    {
      name: "SeasonArchived",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "image.jpg",
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
        let handler = new UpdateEpisodeDraftHandler(
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
        await cleanupSeason();
      },
    },
  ],
});
