import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  getEpisodeDraft,
  getSeasonMetadata,
  insertEpisodeDraftStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { UploadEpisodeVideoHandler } from "./upload_episode_video_handler";
import { UPLOAD_EPISODE_VIDEO_RESPONSE } from "@phading/product_service_interface/publisher/show/frontend/interface";
import { RESUMABLE_VIDEO_UPLOAD } from "@phading/product_service_interface/publisher/show/resumable_video_upload";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { VideoState } from "@phading/product_service_interface/publisher/show/video_state";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/backend/interface";
import { CloudStorageClientFake } from "@selfage/gcs_client/client_fake";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import {
  assertReject,
  assertThat,
  containStr,
  eq,
} from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";
import { createReadStream, existsSync, unlinkSync } from "fs";

async function insertSeason(): Promise<void> {
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
        10,
      ),
      insertEpisodeDraftStatement(
        "season1",
        `ep1`,
        undefined,
        `draftvideo1`,
        VideoState.INCOMPLETE,
        {},
      ),
    ]);
    await transaction.commit();
  });
}

async function cleanupSeason(): Promise<void> {
  try {
    await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([deleteSeasonStatement("season1")]);
      await transaction.commit();
    });
  } catch (e) {}
}

// Requires env variable `SEASON_COVER_IMAGE_BUCKET_NAME="video_bucket"`.

TEST_RUNNER.run({
  name: "UploadEpisodeVideoHandlerTest",
  cases: [
    {
      name: "UploadInterrupted_Resumed",
      execute: async () => {
        // Prepare
        await insertSeason();
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let uploadClientFake = new CloudStorageClientFake("test_data");
        let nowTimestamp = 2000;
        let handler = new UploadEpisodeVideoHandler(
          SPANNER_DATABASE,
          uploadClientFake,
          clientMock,
          () => nowTimestamp,
        );
        let fileStream = createReadStream("test_data/user_image.jpg");
        uploadClientFake.destroyBodyError = new Error("Interrupted");

        // Execute
        let response = await handler.handle(
          "",
          fileStream,
          {
            seasonId: "season1",
            episodeId: "ep1",
            resumableVideoUpload: {},
            videoContentType: "video/mp4",
            videoDuration: 1100,
            videoSize: 1200,
          },
          "session1",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              uploaded: false,
              resumableVideoUpload: {
                url: uploadClientFake.resumeUrl,
                byteOffset: uploadClientFake.resumeByteOffset,
              },
            },
            UPLOAD_EPISODE_VIDEO_RESPONSE,
          ),
          "response",
        );
        let draft = (
          await getEpisodeDraft(SPANNER_DATABASE, "season1", "ep1")
        )[0];
        assertThat(
          draft.episodeDraftResumableVideoUpload,
          eqMessage(
            {
              url: uploadClientFake.resumeUrl,
              byteOffset: uploadClientFake.resumeByteOffset,
            },
            RESUMABLE_VIDEO_UPLOAD,
          ),
          "resumable upload",
        );
        assertThat(
          draft.episodeDraftVideoState,
          eq(VideoState.INCOMPLETE),
          "video state",
        );
        let metadata = (
          await getSeasonMetadata(SPANNER_DATABASE, "season1", "account1")
        )[0];
        assertThat(
          metadata.seasonLastChangeTimestamp,
          eq(nowTimestamp),
          "last change timestamp",
        );

        // Prepare
        fileStream = createReadStream("test_data/user_image.jpg");
        uploadClientFake.destroyBodyError = undefined;
        nowTimestamp = 3000;

        // Execute
        response = await handler.handle(
          "",
          fileStream,
          {
            seasonId: "season1",
            episodeId: "ep1",
            resumableVideoUpload: {
              url: uploadClientFake.resumeUrl,
              byteOffset: uploadClientFake.resumeByteOffset,
            },
            videoContentType: "video/mp4",
            videoDuration: 1100,
            videoSize: 1200,
          },
          "session1",
        );

        // Verify
        assertThat(
          existsSync("test_data/video_bucket/draftvideo1"),
          eq(true),
          "video exists",
        );
        assertThat(
          response,
          eqMessage(
            {
              uploaded: true,
              videoUploadedTimestamp: nowTimestamp,
              resumableVideoUpload: {},
            },
            UPLOAD_EPISODE_VIDEO_RESPONSE,
          ),
          "response",
        );
        draft = (await getEpisodeDraft(SPANNER_DATABASE, "season1", "ep1"))[0];
        assertThat(
          draft.episodeDraftResumableVideoUpload,
          eqMessage({}, RESUMABLE_VIDEO_UPLOAD),
          "resumable upload 2",
        );
        assertThat(
          draft.episodeDraftVideoState,
          eq(VideoState.UPLOADED),
          "video state 2",
        );
        assertThat(draft.episodeDraftVideoDuration, eq(1100), "duration");
        assertThat(draft.episodeDraftVideoSize, eq(1200), "size");
        assertThat(
          draft.episodeDraftVideoUploadedTimestamp,
          eq(nowTimestamp),
          "uploaded timestamp",
        );
        metadata = (
          await getSeasonMetadata(SPANNER_DATABASE, "season1", "account1")
        )[0];
        assertThat(
          metadata.seasonLastChangeTimestamp,
          eq(nowTimestamp),
          "last change timestamp 2",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
        try {
          unlinkSync("test_data/video_bucket/draftvideo1");
        } catch (e) {}
      },
    },
    {
      name: "SeasonNotOwned",
      execute: async () => {
        // Prepare
        await insertSeason();
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account2",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UploadEpisodeVideoHandler(
          SPANNER_DATABASE,
          new CloudStorageClientFake("test_data"),
          clientMock,
          () => 2000,
        );
        let fileStream = createReadStream("test_data/user_image.jpg");

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            fileStream,
            {
              seasonId: "season1",
              episodeId: "ep1",
              resumableVideoUpload: {},
              videoContentType: "video/mp4",
              videoDuration: 1100,
              videoSize: 1200,
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
      name: "DraftNotFound",
      execute: async () => {
        // Prepare
        await insertSeason();
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UploadEpisodeVideoHandler(
          SPANNER_DATABASE,
          new CloudStorageClientFake("test_data"),
          clientMock,
          () => 2000,
        );
        let fileStream = createReadStream("test_data/user_image.jpg");

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            fileStream,
            {
              seasonId: "season1",
              episodeId: "ep2",
              resumableVideoUpload: {},
              videoContentType: "video/mp4",
              videoDuration: 1100,
              videoSize: 1200,
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr("Season season1 episode ep2 is not found."),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
  ],
});
