import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  getEpisode,
  getEpisodesWithinIndexRange,
  getSeasonMetadata,
  insertEpisodeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { UpdateEpisodeOrderHandler } from "./update_episode_order_handler";
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

async function insertEpisodes(num: number): Promise<void> {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    let statements = new Array<Statement>();
    statements.push(
      insertSeasonStatement(
        "season1",
        "account1",
        "a name",
        "file.jpg",
        1000,
        1000,
        SeasonState.PUBLISHED,
        num,
      ),
    );
    for (let i = 1; i <= num; i++) {
      statements.push(
        insertEpisodeStatement(
          "season1",
          `ep${i}`,
          undefined,
          i,
          "video",
          1200,
          1300,
          1000,
          1000,
        ),
      );
    }
    await transaction.batchUpdate(statements);
    await transaction.commit();
  });
}

async function cleanupSeason(): Promise<void> {
  try {
    await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
      await transaction.runUpdate(deleteSeasonStatement("season1"));
      await transaction.commit();
    });
  } catch (e) {}
}

TEST_RUNNER.run({
  name: "UpdateEpisodeOrderHandlerTest",
  cases: [
    {
      name: "MoveAhead",
      execute: async () => {
        // Prepare
        await insertEpisodes(100);
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let nowTimestamp = 2000;
        let handler = new UpdateEpisodeOrderHandler(
          SPANNER_DATABASE,
          clientMock,
          () => nowTimestamp,
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "ep95",
            toIndex: 90,
          },
          "session1",
        );

        // Verify
        let episodes = await getEpisodesWithinIndexRange(
          SPANNER_DATABASE,
          "season1",
          91,
          95,
        );
        assertThat(
          episodes.map((e) => e.episodeEpisodeId),
          isArray([eq("ep94"), eq("ep93"), eq("ep92"), eq("ep91"), eq("ep90")]),
          "updated episodes",
        );
        let movedEp = (
          await getEpisode(SPANNER_DATABASE, "season1", "ep95")
        )[0];
        assertThat(movedEp.episodeIndex, eq(90), "moved index");
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
      name: "MoveBack",
      execute: async () => {
        // Prepare
        await insertEpisodes(100);
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let nowTimestamp = 2000;
        let handler = new UpdateEpisodeOrderHandler(
          SPANNER_DATABASE,
          clientMock,
          () => nowTimestamp,
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "ep50",
            toIndex: 55,
          },
          "session1",
        );

        // Verify
        let episodes = await getEpisodesWithinIndexRange(
          SPANNER_DATABASE,
          "season1",
          50,
          54,
        );
        assertThat(
          episodes.map((e) => e.episodeEpisodeId),
          isArray([eq("ep55"), eq("ep54"), eq("ep53"), eq("ep52"), eq("ep51")]),
          "updated episodes",
        );
        let movedEp = (
          await getEpisode(SPANNER_DATABASE, "season1", "ep50")
        )[0];
        assertThat(movedEp.episodeIndex, eq(55), "moved index");
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
      name: "IndexTooSmall",
      execute: async () => {
        // Prepare
        await insertEpisodes(10);
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateEpisodeOrderHandler(
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
              episodeId: "ep50",
              toIndex: 0,
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr(`"toIndex" must be larger than 0`),
          "error",
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
        await insertEpisodes(10);
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account2",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateEpisodeOrderHandler(
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
              episodeId: "ep50",
              toIndex: 1,
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr(`Season season1 is not found`),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "ToIndexTooLarge",
      execute: async () => {
        // Prepare
        await insertEpisodes(10);
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateEpisodeOrderHandler(
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
              episodeId: "ep50",
              toIndex: 11,
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr(
            `The target index 11 is larger than the total number of episodes`,
          ),
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
        await insertEpisodes(10);
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateEpisodeOrderHandler(
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
              episodeId: "ep50",
              toIndex: 5,
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr(`Season season1 episode ep50 is not found`),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "NoNeedToUpdate",
      execute: async () => {
        // Prepare
        await insertEpisodes(10);
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateEpisodeOrderHandler(
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
              episodeId: "ep5",
              toIndex: 5,
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr(`The target index 5 is already set`),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
  ],
});
