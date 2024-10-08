import { StorageFake } from "../../../common/cloud_storage_fake";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertEpisodeDraftStatement,
  insertEpisodeStatement,
  insertSeasonGradeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { GetSeasonDetailsHandler } from "./get_season_details_handler";
import { Statement } from "@google-cloud/spanner/build/src/transaction";
import { GET_SEASON_DETAILS_RESPONSE } from "@phading/product_service_interface/publisher/show/frontend/interface";
import { Episode } from "@phading/product_service_interface/publisher/show/frontend/season_details";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { VideoState } from "@phading/product_service_interface/publisher/show/video_state";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/backend/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat, containStr } from "@selfage/test_matcher";
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
  name: "GetSeasonDetailsHandlerTest",
  cases: [
    {
      name: "GetSimpleDraft",
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
              SeasonState.DRAFT,
              0,
            ),
            insertSeasonGradeStatement("season1", "grade1", 12, 0, 10000),
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
        let handler = new GetSeasonDetailsHandler(
          SPANNER_DATABASE,
          new StorageFake() as any,
          clientMock,
          () => 2000,
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
              seasonDetails: {
                seasonId: "season1",
                name: "a name",
                coverImageUrl: "file.jpg",
                grade: 12,
                createdTimestamp: 1000,
                lastChangeTimestamp: 1000,
                totalEpisodes: 0,
                state: SeasonState.DRAFT,
              },
              drafts: [],
              episodes: [],
              indexCursor: 0,
            },
            GET_SEASON_DETAILS_RESPONSE,
          ),
          "response",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "GetPublishedWithNextGrade",
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
            insertSeasonGradeStatement("season1", "grade1", 1, 0, 10),
            insertSeasonGradeStatement("season1", "grade2", 12, 10, 10000),
            insertSeasonGradeStatement("season1", "grade3", 30, 10000, 20000),
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
        let handler = new GetSeasonDetailsHandler(
          SPANNER_DATABASE,
          new StorageFake() as any,
          clientMock,
          () => 2000,
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
              seasonDetails: {
                seasonId: "season1",
                name: "a name",
                coverImageUrl: "file.jpg",
                grade: 12,
                nextGrade: {
                  grade: 30,
                  effectiveTimestamp: 10000,
                },
                createdTimestamp: 1000,
                lastChangeTimestamp: 1000,
                totalEpisodes: 0,
                state: SeasonState.PUBLISHED,
              },
              drafts: [],
              episodes: [],
              indexCursor: 0,
            },
            GET_SEASON_DETAILS_RESPONSE,
          ),
          "response",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "GetPublishedWithOneEpisode",
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
              1,
            ),
            insertSeasonGradeStatement("season1", "grade1", 12, 0, 10000),
            insertEpisodeDraftStatement(
              "season1",
              "ep1",
              "ep 1",
              "draftvideo1",
              VideoState.INCOMPLETE,
              {},
            ),
            insertEpisodeStatement(
              "season1",
              "ep2",
              "ep 2",
              1,
              "publishedvideo1",
              1300,
              1500,
              2000,
              3000,
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
        let handler = new GetSeasonDetailsHandler(
          SPANNER_DATABASE,
          new StorageFake() as any,
          clientMock,
          () => 2000,
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
              seasonDetails: {
                seasonId: "season1",
                name: "a name",
                coverImageUrl: "file.jpg",
                grade: 12,
                createdTimestamp: 1000,
                lastChangeTimestamp: 1000,
                totalEpisodes: 1,
                state: SeasonState.PUBLISHED,
              },
              drafts: [
                {
                  episodeId: "ep1",
                  name: "ep 1",
                  resumableVideoUpload: {},
                  videoState: VideoState.INCOMPLETE,
                },
              ],
              episodes: [
                {
                  episodeId: "ep2",
                  name: "ep 2",
                  index: 1,
                  videoDuration: 1300,
                  videoSize: 1500,
                  publishedTimestamp: 2000,
                  premierTimestamp: 3000,
                },
              ],
              indexCursor: 1,
            },
            GET_SEASON_DETAILS_RESPONSE,
          ),
          "response",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "GetPublishedWithManyEpisodes",
      execute: async () => {
        // Prepare
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
              1,
            ),
            insertSeasonGradeStatement("season1", "grade1", 12, 0, 10000),
          );
          for (let i = 1; i <= 30; i++) {
            statements.push(
              insertEpisodeStatement(
                "season1",
                `ep${i}`,
                undefined,
                i,
                "video",
                1300,
                1500,
                2000,
                3000,
              ),
            );
          }
          await transaction.batchUpdate(statements);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new GetSeasonDetailsHandler(
          SPANNER_DATABASE,
          new StorageFake() as any,
          clientMock,
          () => 2000,
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
        let episodes = new Array<Episode>();
        for (let i = 30; i > 10; i--) {
          episodes.push({
            episodeId: `ep${i}`,
            index: i,
            videoDuration: 1300,
            videoSize: 1500,
            publishedTimestamp: 2000,
            premierTimestamp: 3000,
          });
        }
        assertThat(
          response,
          eqMessage(
            {
              seasonDetails: {
                seasonId: "season1",
                name: "a name",
                coverImageUrl: "file.jpg",
                grade: 12,
                createdTimestamp: 1000,
                lastChangeTimestamp: 1000,
                totalEpisodes: 1,
                state: SeasonState.PUBLISHED,
              },
              drafts: [],
              episodes,
              indexCursor: 11,
            },
            GET_SEASON_DETAILS_RESPONSE,
          ),
          "response",
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
              "account2",
              "a name",
              "file.jpg",
              1000,
              1000,
              SeasonState.DRAFT,
              0,
            ),
            insertSeasonGradeStatement("season1", "grade1", 12, 0, 10000),
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
        let handler = new GetSeasonDetailsHandler(
          SPANNER_DATABASE,
          new StorageFake() as any,
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
      name: "OnlyOneGradeInTheFuture",
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
              SeasonState.DRAFT,
              0,
            ),
            insertSeasonGradeStatement("season1", "grade1", 10, 10000, 20000),
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
        let handler = new GetSeasonDetailsHandler(
          SPANNER_DATABASE,
          new StorageFake() as any,
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
          containStr(
            "Grade grade1's start timestamp 10000 should be smaller than now 2000",
          ),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "TwoGradesOverlapped",
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
              SeasonState.DRAFT,
              0,
            ),
            insertSeasonGradeStatement("season1", "grade1", 10, 0, 10000),
            insertSeasonGradeStatement("season1", "grade2", 20, 1000, 20000),
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
        let handler = new GetSeasonDetailsHandler(
          SPANNER_DATABASE,
          new StorageFake() as any,
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
          containStr(
            "Grade grade2's start timestamp 1000 should be larger than now 2000",
          ),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "BothGradesInTheFuture",
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
              SeasonState.DRAFT,
              0,
            ),
            insertSeasonGradeStatement("season1", "grade1", 10, 5000, 10000),
            insertSeasonGradeStatement("season1", "grade2", 20, 10000, 20000),
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
        let handler = new GetSeasonDetailsHandler(
          SPANNER_DATABASE,
          new StorageFake() as any,
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
          containStr(
            "Grade grade1's start timestamp 5000 should be smaller than now 2000",
          ),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
  ],
});
