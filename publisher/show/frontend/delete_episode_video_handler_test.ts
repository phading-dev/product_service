import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  deleteVideoFileStatement,
  getEpisodeDraft,
  getVideoFiles,
  insertEpisodeDraftStatement,
  insertSeasonStatement,
  insertVideoFileStatement,
} from "../../../db/sql";
import { DeleteEpisodeVideoHandler } from "./delete_episode_video_handler";
import { DELETE_EPISODE_VIDEO_RESPONSE } from "@phading/product_service_interface/publisher/show/frontend/interface";
import { RESUMABLE_VIDEO_UPLOAD } from "@phading/product_service_interface/publisher/show/resumable_video_upload";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { VideoState } from "@phading/product_service_interface/publisher/show/video_state";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/backend/interface";
import { eqMessage } from "@selfage/message/test_matcher";
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
  name: "DeleteEpisodeVideoHandlerTest",
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
              {
                url: "some_url",
              },
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
        let handler = new DeleteEpisodeVideoHandler(
          SPANNER_DATABASE,
          clientMock,
          () => "new file",
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "ep1",
          },
          "session1",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              videoState: VideoState.INCOMPLETE,
              resumableVideoUpload: {},
            },
            DELETE_EPISODE_VIDEO_RESPONSE,
          ),
          "response",
        );
        let draft = (
          await getEpisodeDraft(SPANNER_DATABASE, "season1", "ep1")
        )[0];
        assertThat(draft.episodeDraftVideoFilename, eq("new file"), "filename");
        assertThat(
          draft.episodeDraftResumableVideoUpload,
          eqMessage({}, RESUMABLE_VIDEO_UPLOAD),
          "resumable video upload",
        );
        assertThat(
          draft.episodeDraftVideoState,
          eq(VideoState.INCOMPLETE),
          "video state",
        );
        let notUsedFile = (await getVideoFiles(SPANNER_DATABASE, false))[0];
        assertThat(
          notUsedFile.videoFileFilename,
          eq("video"),
          "not used video file",
        );
        let newFile = (await getVideoFiles(SPANNER_DATABASE, true))[0];
        assertThat(newFile.videoFileFilename, eq("new file"), "new video");
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "SeasonNotOnwed",
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
        let handler = new DeleteEpisodeVideoHandler(
          SPANNER_DATABASE,
          clientMock,
          () => "new file",
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
        let handler = new DeleteEpisodeVideoHandler(
          SPANNER_DATABASE,
          clientMock,
          () => "new file",
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
