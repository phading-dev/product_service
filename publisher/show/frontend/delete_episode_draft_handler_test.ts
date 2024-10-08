import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  deleteVideoFileStatement,
  getEpisodeDraft,
  getSeasonMetadata,
  getVideoFiles,
  insertEpisodeDraftStatement,
  insertSeasonStatement,
  insertVideoFileStatement,
} from "../../../db/sql";
import { DeleteEpisodeDraftHandler } from "./delete_episode_draft_handler";
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
      let [usedFiles, notUsedFiles] = await Promise.all([
        getVideoFiles(transaction, true),
        getVideoFiles(transaction, false),
      ]);
      await transaction.batchUpdate([
        ...usedFiles.map((file) =>
          deleteVideoFileStatement(file.videoFileFilename),
        ),
        ...notUsedFiles.map((file) =>
          deleteVideoFileStatement(file.videoFileFilename),
        ),
        deleteSeasonStatement("season1"),
      ]);
      await transaction.commit();
    });
  } catch (e) {}
}

TEST_RUNNER.run({
  name: "DeleteEpisodeDraftHandlerTest",
  cases: [
    {
      name: "Success",
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
              undefined,
              "video",
              VideoState.INCOMPLETE,
              {},
            ),
            insertVideoFileStatement("video", true),
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
        let handler = new DeleteEpisodeDraftHandler(
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
        let videoFile = (await getVideoFiles(SPANNER_DATABASE, false))[0];
        assertThat(videoFile.videoFileFilename, eq("video"), "video file");
        let drafts = await getEpisodeDraft(SPANNER_DATABASE, "season1", "ep1");
        assertThat(drafts.length, eq(0), "no draft");
        let metadata = (
          await getSeasonMetadata(SPANNER_DATABASE, "season1", "account1")
        )[0];
        assertThat(
          metadata.seasonLastChangeTimestamp,
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
        let handler = new DeleteEpisodeDraftHandler(
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
          containStr("Season season1 is not found"),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "DraftNotFound",
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
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new DeleteEpisodeDraftHandler(
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
          containStr("Season season1 episode draft ep1 is not found"),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
  ],
});
