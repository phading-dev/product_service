import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  deleteVideoFileStatement,
  getEpisodeDraft,
  getSeasonMetadata,
  getVideoFiles,
  insertSeasonStatement,
} from "../../../db/sql";
import { CreateEpisodeDraftHandler } from "./create_episode_draft_handler";
import { CREATE_EPISODE_DRAFT_RESPONSE } from "@phading/product_service_interface/publisher/show/frontend/interface";
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

async function insertSeason(
  state: SeasonState = SeasonState.DRAFT,
): Promise<void> {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    await transaction.batchUpdate([
      insertSeasonStatement(
        "season1",
        "account1",
        "a name",
        "image.jpg",
        1000,
        1000,
        state,
        0,
      ),
    ]);
    await transaction.commit();
  });
}

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
  name: "CreateEpisodeDraftHandlerTest",
  cases: [
    {
      name: "WithoutName",
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
        let nowTimestamp = 2000;
        let handler = new CreateEpisodeDraftHandler(
          SPANNER_DATABASE,
          clientMock,
          () => nowTimestamp,
          () => "epid1",
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            seasonId: "season1",
          },
          "session1",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              draft: {
                episodeId: "epid1",
                resumableVideoUpload: {},
                videoState: VideoState.INCOMPLETE,
              },
            },
            CREATE_EPISODE_DRAFT_RESPONSE,
          ),
          "response",
        );
        let draft = (
          await getEpisodeDraft(SPANNER_DATABASE, "season1", "epid1")
        )[0];
        assertThat(draft.episodeDraftName, eq(undefined), "ep name");
        assertThat(
          draft.episodeDraftVideoFilename,
          eq("epid1"),
          "video filename",
        );
        let videoFile = (await getVideoFiles(SPANNER_DATABASE, true))[0];
        assertThat(videoFile.videoFileFilename, eq("epid1"), "video file");
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
      name: "WithName",
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
        let handler = new CreateEpisodeDraftHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 2000,
          () => "epid1",
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeName: "ep name",
          },
          "session1",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              draft: {
                episodeId: "epid1",
                name: "ep name",
                resumableVideoUpload: {},
                videoState: VideoState.INCOMPLETE,
              },
            },
            CREATE_EPISODE_DRAFT_RESPONSE,
          ),
          "response",
        );
        let draft = (
          await getEpisodeDraft(SPANNER_DATABASE, "season1", "epid1")
        )[0];
        assertThat(draft.episodeDraftName, eq("ep name"), "ep name");
      },
      tearDown: async () => {
        await cleanupSeason();
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
        let handler = new CreateEpisodeDraftHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 2000,
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
        await cleanupSeason();
      },
    },
    {
      name: "SeasonArchived",
      execute: async () => {
        // Prepare
        await insertSeason(SeasonState.ARCHIVED);
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new CreateEpisodeDraftHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 2000,
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
        await cleanupSeason();
      },
    },
  ],
});
