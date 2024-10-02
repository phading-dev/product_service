import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  deleteVideoFileStatement,
  getEpisode,
  getEpisodesWithinIndexRange,
  getSeasonMetadata,
  getVideoFiles,
  insertEpisodeStatement,
  insertSeasonStatement,
  insertVideoFileStatement,
} from "../../../db/sql";
import { DeleteEpisodeHandler } from "./delete_episode_handler";
import { Statement } from "@google-cloud/spanner/build/src/transaction";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/backend/interface";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import {
  assertReject,
  assertThat,
  containStr,
  eq,
  isArray,
} from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

async function insertEpisodes(): Promise<void> {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    let statements = new Array<Statement>();
    for (let i = 1; i <= 30; i++) {
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
  name: "DeleteEpisodeHandlerTest",
  cases: [
    {
      name: "Success",
      execute: async () => {
        // Prepare
        await insertEpisodes();
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let nowTimestamp = 2000;
        let handler = new DeleteEpisodeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => nowTimestamp,
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "ep25",
          },
          "session1",
        );

        // Verify
        let videoFiles = await getVideoFiles(SPANNER_DATABASE, false);
        assertThat(videoFiles.length, eq(1), "# of deleted files");
        assertThat(
          videoFiles[0].videoFileFilename,
          eq("video25"),
          "deleted file",
        );
        let deletedEp = await getEpisode(SPANNER_DATABASE, "season1", "ep25");
        assertThat(deletedEp.length, eq(0), "deleted episode");
        let episodes = await getEpisodesWithinIndexRange(
          SPANNER_DATABASE,
          "season1",
          25,
          29,
        );
        assertThat(
          episodes.map((e) => e.episodeEpisodeId),
          isArray([eq("ep30"), eq("ep29"), eq("ep28"), eq("ep27"), eq("ep26")]),
          "episodes",
        );
        let metadata = (
          await getSeasonMetadata(SPANNER_DATABASE, "season1", "account1")
        )[0];
        assertThat(metadata.seasonTotalEpisodes, eq(29), "total episodes");
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
      name: "DeleteTheLastEpisode",
      execute: async () => {
        // Prepare
        await insertEpisodes();
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new DeleteEpisodeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 2000,
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "ep30",
          },
          "session1",
        );

        // Verify
        let episodes = await getEpisodesWithinIndexRange(
          SPANNER_DATABASE,
          "season1",
          29,
          30,
        );
        assertThat(
          episodes.map((e) => e.episodeEpisodeId),
          isArray([eq("ep29")]),
          "episodes",
        );
        let metadata = (
          await getSeasonMetadata(SPANNER_DATABASE, "season1", "account1")
        )[0];
        assertThat(metadata.seasonTotalEpisodes, eq(29), "total episodes");
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "SeasonNotOwned",
      execute: async () => {
        // Prepare
        await insertEpisodes();
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account2",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new DeleteEpisodeHandler(
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
              episodeId: "ep25",
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
      name: "EpisodeNotFound",
      execute: async () => {
        // Prepare
        await insertEpisodes();
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new DeleteEpisodeHandler(
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
              episodeId: "ep40",
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr("Season season1 episode ep40 is not found"),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
  ],
});
