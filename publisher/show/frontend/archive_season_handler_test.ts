import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteDeletingCoverImageFileStatement,
  deleteSeasonStatement,
  deleteVideoFileStatement,
  getDeletingCoverImageFiles,
  getEpisodeDrafts,
  getLastEpisodes,
  getSeasonMetadata,
  getVideoFiles,
  insertEpisodeDraftStatement,
  insertEpisodeStatement,
  insertSeasonStatement,
  insertVideoFileStatement,
} from "../../../db/sql";
import { ArchiveSeasonHandler } from "./archive_season_handler";
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

async function insertSeasonAndEpisodes(): Promise<void> {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    let statements = new Array<Statement>();
    for (let i = 1; i <= 10; i++) {
      statements.push(
        insertEpisodeDraftStatement(
          "season1",
          `ep${i}`,
          undefined,
          `draftvideo${i}`,
          VideoState.INCOMPLETE,
          {},
        ),
        insertVideoFileStatement(`draftvideo${i}`, true),
      );
    }
    for (let i = 1; i <= 10; i++) {
      statements.push(
        insertEpisodeStatement(
          "season1",
          `ep${i}`,
          undefined,
          i,
          `video${i}`,
          1200,
          1300,
          1000,
          1000,
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
        SeasonState.PUBLISHED,
        10,
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
  name: "ArchiveSeasonHandlerTest",
  cases: [
    {
      name: "Success",
      execute: async () => {
        // Prepare
        await insertSeasonAndEpisodes();
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let nowTimestamp = 2000;
        let handler = new ArchiveSeasonHandler(
          SPANNER_DATABASE,
          clientMock,
          () => nowTimestamp,
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
        let drafts = await getEpisodeDrafts(SPANNER_DATABASE, "season1");
        assertThat(drafts.length, eq(0), "# of drafts");
        let episodes = await getLastEpisodes(SPANNER_DATABASE, "season1");
        assertThat(episodes.length, eq(0), "# of episodes");
        let notUsedFiles = await getVideoFiles(SPANNER_DATABASE, false);
        assertThat(notUsedFiles.length, eq(20), "# of not used files");
        let deletingCoverImages =
          await getDeletingCoverImageFiles(SPANNER_DATABASE);
        assertThat(
          deletingCoverImages.length,
          eq(1),
          "# of deleting cover images",
        );
        assertThat(
          deletingCoverImages[0].deletingCoverImageFileFilename,
          eq("file.jpg"),
          "deleting cover image",
        );
        let metadata = (
          await getSeasonMetadata(SPANNER_DATABASE, "season1", "account1")
        )[0];
        assertThat(metadata.seasonState, eq(SeasonState.ARCHIVED), "state");
        assertThat(metadata.seasonTotalEpisodes, eq(0), "total episodes");
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
      name: "EmptySeason",
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
        let handler = new ArchiveSeasonHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 2000,
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
        let notUsedFiles = await getVideoFiles(SPANNER_DATABASE, false);
        assertThat(notUsedFiles.length, eq(0), "# of not used files");
        let deletingCoverImages =
          await getDeletingCoverImageFiles(SPANNER_DATABASE);
        assertThat(
          deletingCoverImages.length,
          eq(1),
          "# of deleting cover images",
        );
        assertThat(
          deletingCoverImages[0].deletingCoverImageFileFilename,
          eq("file.jpg"),
          "deleting cover image",
        );
        let metadata = (
          await getSeasonMetadata(SPANNER_DATABASE, "season1", "account1")
        )[0];
        assertThat(metadata.seasonState, eq(SeasonState.ARCHIVED), "state");
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "SeasonNotOwned",
      execute: async () => {
        // Prepare
        await insertSeasonAndEpisodes();
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account2",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new ArchiveSeasonHandler(
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
      name: "AlreadyArchived",
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
        let handler = new ArchiveSeasonHandler(
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
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr("Season season1 is not in PUBLISHED state"),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
  ],
});
