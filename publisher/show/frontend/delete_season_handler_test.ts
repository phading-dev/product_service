import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteDeletingCoverImageFileStatement,
  deleteSeasonStatement,
  deleteVideoFileStatement,
  getDeletingCoverImageFiles,
  getEpisodeDrafts,
  getSeasonMetadata,
  getVideoFiles,
  insertEpisodeDraftStatement,
  insertSeasonStatement,
  insertVideoFileStatement,
} from "../../../db/sql";
import { DeleteSeasonHandler } from "./delete_season_handler";
import { Statement } from "@google-cloud/spanner/build/src/transaction";
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

async function insertEpisodeDrafts(): Promise<void> {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    let statements = new Array<Statement>();
    for (let i = 1; i <= 30; i++) {
      statements.push(
        insertEpisodeDraftStatement(
          "season1",
          `ep${i}`,
          undefined,
          `video${i}`,
          VideoState.EMPTY,
          {},
        ),
        insertVideoFileStatement(`video${i}`, true),
      );
    }
    await transaction.batchUpdate([
      insertSeasonStatement(
        "season1",
        "account1",
        "a name",
        "file.jpg",
        1000,
        1000,
        SeasonState.DRAFT,
        30,
      ),
      ...statements,
    ]);
    await transaction.commit();
  });
}

async function cleanupSeason(): Promise<void> {
  try {
    await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
      let [usedFiles, notUsedFiles, coverImages] = await Promise.all([
        getVideoFiles(transaction, true),
        getVideoFiles(transaction, false),
        getDeletingCoverImageFiles(transaction),
      ]);
      await transaction.batchUpdate([
        ...usedFiles.map((file) =>
          deleteVideoFileStatement(file.videoFileFilename),
        ),
        ...notUsedFiles.map((file) =>
          deleteVideoFileStatement(file.videoFileFilename),
        ),
        ...coverImages.map((file) =>
          deleteDeletingCoverImageFileStatement(
            file.deletingCoverImageFileFilename,
          ),
        ),
        deleteSeasonStatement("season1"),
      ]);
      await transaction.commit();
    });
  } catch (e) {}
}

TEST_RUNNER.run({
  name: "DeleteSeasonHandlerTest",
  cases: [
    {
      name: "Success",
      execute: async () => {
        // Prepare
        await insertEpisodeDrafts();
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new DeleteSeasonHandler(SPANNER_DATABASE, clientMock);

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
          },
          "session1",
        );

        // Verify
        let drafts = await getEpisodeDrafts(SPANNER_DATABASE, "season1");
        assertThat(drafts.length, eq(0), "# of drafts");
        let metadataRows = await getSeasonMetadata(
          SPANNER_DATABASE,
          "season1",
          "account1",
        );
        assertThat(metadataRows.length, eq(0), "deleted season");
        let videoFiles = await getVideoFiles(SPANNER_DATABASE, false);
        assertThat(videoFiles.length, eq(30), "# of video files");
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "SeasonNotOwned",
      execute: async () => {
        // Prepare
        await insertEpisodeDrafts();
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account2",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new DeleteSeasonHandler(SPANNER_DATABASE, clientMock);

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
          containStr("Season season1 is not found"),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "PublishedSeasonCannotBeDeleted",
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
              SeasonState.PUBLISHED,
              30,
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
        let handler = new DeleteSeasonHandler(SPANNER_DATABASE, clientMock);

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
          containStr("Season season1 is not in DRAFT state"),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
  ],
});
