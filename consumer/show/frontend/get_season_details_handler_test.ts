import { FakeBucket } from "../../../common/cloud_storage_fake";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertEpisodeStatement,
  insertSeasonGradeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { GetSeasonDetailsHandler } from "./get_season_details_handler";
import { Statement } from "@google-cloud/spanner/build/src/transaction";
import { GET_SEASON_DETAILS_RESPONSE } from "@phading/product_service_interface/consumer/show/frontend/interface";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import {
  GET_CONTINUE_EPISODE,
  GET_CONTINUE_EPISODE_REQUEST_BODY,
  GetContinueEpisodeResponse,
} from "@phading/user_activity_service_interface/consumer/show/backend/interface";
import {
  GET_ACCOUNT_SNAPSHOT,
  GET_ACCOUNT_SNAPSHOT_REQUEST_BODY,
  GetAccountSnapshotResponse,
} from "@phading/user_service_interface/third_person/backend/interface";
import {
  EXCHANGE_SESSION_AND_CHECK_CAPABILITY,
  ExchangeSessionAndCheckCapabilityResponse,
} from "@phading/user_session_service_interface/backend/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat, containStr } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

async function insertSeasonAndEpisodes(num: number): Promise<void> {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    let statements = new Array<Statement>();
    for (let i = 1; i <= num; i++) {
      statements.push(
        insertEpisodeStatement(
          "season1",
          `ep${i}`,
          `EP${i}`,
          i,
          `video${i}`,
          1200,
          1300,
          1000,
          1000,
        ),
      );
    }
    await transaction.batchUpdate([
      insertSeasonStatement(
        "season1",
        "publisher1",
        "a name",
        "file.jpg",
        1000,
        1000,
        SeasonState.PUBLISHED,
        num,
      ),
      insertSeasonGradeStatement("season1", "grade1", 15, 1000, 10000),
      ...statements,
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

TEST_RUNNER.run({
  name: "GetSeasonDetailsHandlerTest",
  cases: [
    {
      name: "NoContinueEpisode",
      execute: async () => {
        // Prepare
        await insertSeasonAndEpisodes(10);
        let clientMock = new (class extends NodeServiceClientMock {
          public async send(request: any): Promise<any> {
            switch (request.descriptor) {
              case EXCHANGE_SESSION_AND_CHECK_CAPABILITY:
                return {
                  userSession: {
                    accountId: "consumer1",
                  },
                  canConsumeShows: true,
                } as ExchangeSessionAndCheckCapabilityResponse;
              case GET_CONTINUE_EPISODE:
                assertThat(
                  request.body,
                  eqMessage(
                    {
                      seasonId: "season1",
                    },
                    GET_CONTINUE_EPISODE_REQUEST_BODY,
                  ),
                  "GET_CONTINUE_EPISODE_REQUEST_BODY",
                );
                return {} as GetContinueEpisodeResponse;
              case GET_ACCOUNT_SNAPSHOT:
                assertThat(
                  request.body,
                  eqMessage(
                    {
                      accountId: "publisher1",
                    },
                    GET_ACCOUNT_SNAPSHOT_REQUEST_BODY,
                  ),
                  "GET_ACCOUNT_SNAPSHOT_REQUEST_BODY",
                );
                return {
                  account: {
                    accountId: "publisher1",
                    avatarSmallUrl: "publisher_avatar.jpg",
                    naturalName: "A Publisher",
                  },
                } as GetAccountSnapshotResponse;
              default:
                throw new Error("Expected");
            }
          }
        })();
        let handler = new GetSeasonDetailsHandler(
          SPANNER_DATABASE,
          new FakeBucket() as any,
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
                grade: 15,
                totalEpisodes: 10,
                publisher: {
                  accountId: "publisher1",
                  avatarSmallUrl: "publisher_avatar.jpg",
                  name: "A Publisher",
                },
                continueEpisode: {
                  episodeId: "ep1",
                  index: 1,
                  name: "EP1",
                  premierTimestamp: 1000,
                  videoLength: 1200,
                },
                continueTimestampstamp: 0,
              },
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
      name: "WithContinueEpisode",
      execute: async () => {
        // Prepare
        await insertSeasonAndEpisodes(10);
        let clientMock = new (class extends NodeServiceClientMock {
          public async send(request: any): Promise<any> {
            switch (request.descriptor) {
              case EXCHANGE_SESSION_AND_CHECK_CAPABILITY:
                return {
                  userSession: {
                    accountId: "consumer1",
                  },
                  canConsumeShows: true,
                } as ExchangeSessionAndCheckCapabilityResponse;
              case GET_CONTINUE_EPISODE:
                return {
                  episodeId: "ep5",
                  continueTimestamp: 500,
                } as GetContinueEpisodeResponse;
              case GET_ACCOUNT_SNAPSHOT:
                return {
                  account: {
                    accountId: "publisher1",
                    avatarSmallUrl: "publisher_avatar.jpg",
                    naturalName: "A Publisher",
                  },
                } as GetAccountSnapshotResponse;
              default:
                throw new Error("Expected");
            }
          }
        })();
        let handler = new GetSeasonDetailsHandler(
          SPANNER_DATABASE,
          new FakeBucket() as any,
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
                grade: 15,
                totalEpisodes: 10,
                publisher: {
                  accountId: "publisher1",
                  avatarSmallUrl: "publisher_avatar.jpg",
                  name: "A Publisher",
                },
                continueEpisode: {
                  episodeId: "ep5",
                  index: 5,
                  name: "EP5",
                  premierTimestamp: 1000,
                  videoLength: 1200,
                },
                continueTimestampstamp: 500,
              },
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
      name: "NoValidSeasonGrade",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "publisher1",
              "a name",
              "file.jpg",
              1000,
              1000,
              SeasonState.PUBLISHED,
              1,
            ),
            insertSeasonGradeStatement("season1", "grade1", 15, 0, 1000),
            insertEpisodeStatement(
              "season1",
              `ep1`,
              `EP1`,
              1,
              `video1`,
              1200,
              1300,
              1000,
              1000,
            ),
          ]);
          await transaction.commit();
        });
        let clientMock = new (class extends NodeServiceClientMock {
          public async send(request: any): Promise<any> {
            switch (request.descriptor) {
              case EXCHANGE_SESSION_AND_CHECK_CAPABILITY:
                return {
                  userSession: {
                    accountId: "consumer1",
                  },
                  canConsumeShows: true,
                } as ExchangeSessionAndCheckCapabilityResponse;
              case GET_CONTINUE_EPISODE:
                return {} as GetContinueEpisodeResponse;
              case GET_ACCOUNT_SNAPSHOT:
                return {
                  account: {
                    accountId: "publisher1",
                    avatarSmallUrl: "publisher_avatar.jpg",
                    naturalName: "A Publisher",
                  },
                } as GetAccountSnapshotResponse;
              default:
                throw new Error("Expected");
            }
          }
        })();
        let handler = new GetSeasonDetailsHandler(
          SPANNER_DATABASE,
          new FakeBucket() as any,
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
          containStr("Season season1 is not found"),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "SeasonNotPublished",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "publisher1",
              "a name",
              "file.jpg",
              1000,
              1000,
              SeasonState.DRAFT,
              1,
            ),
            insertSeasonGradeStatement("season1", "grade1", 15, 1000, 10000),
            insertEpisodeStatement(
              "season1",
              `ep1`,
              `EP1`,
              1,
              `video1`,
              1200,
              1300,
              1000,
              1000,
            ),
          ]);
          await transaction.commit();
        });
        let clientMock = new (class extends NodeServiceClientMock {
          public async send(request: any): Promise<any> {
            switch (request.descriptor) {
              case EXCHANGE_SESSION_AND_CHECK_CAPABILITY:
                return {
                  userSession: {
                    accountId: "consumer1",
                  },
                  canConsumeShows: true,
                } as ExchangeSessionAndCheckCapabilityResponse;
              case GET_CONTINUE_EPISODE:
                return {} as GetContinueEpisodeResponse;
              case GET_ACCOUNT_SNAPSHOT:
                return {
                  account: {
                    accountId: "publisher1",
                    avatarSmallUrl: "publisher_avatar.jpg",
                    naturalName: "A Publisher",
                  },
                } as GetAccountSnapshotResponse;
              default:
                throw new Error("Expected");
            }
          }
        })();
        let handler = new GetSeasonDetailsHandler(
          SPANNER_DATABASE,
          new FakeBucket() as any,
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
          containStr("Season season1 is not found"),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "NoEpisode",
      execute: async () => {
        // Prepare
        await insertSeasonAndEpisodes(0);
        let clientMock = new (class extends NodeServiceClientMock {
          public async send(request: any): Promise<any> {
            switch (request.descriptor) {
              case EXCHANGE_SESSION_AND_CHECK_CAPABILITY:
                return {
                  userSession: {
                    accountId: "consumer1",
                  },
                  canConsumeShows: true,
                } as ExchangeSessionAndCheckCapabilityResponse;
              case GET_CONTINUE_EPISODE:
                return {} as GetContinueEpisodeResponse;
              case GET_ACCOUNT_SNAPSHOT:
                return {
                  account: {
                    accountId: "publisher1",
                    avatarSmallUrl: "publisher_avatar.jpg",
                    naturalName: "A Publisher",
                  },
                } as GetAccountSnapshotResponse;
              default:
                throw new Error("Expected");
            }
          }
        })();
        let handler = new GetSeasonDetailsHandler(
          SPANNER_DATABASE,
          new FakeBucket() as any,
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
          containStr("First episode of season season1"),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "ContinueEpisodeNotFound",
      execute: async () => {
        // Prepare
        await insertSeasonAndEpisodes(1);
        let clientMock = new (class extends NodeServiceClientMock {
          public async send(request: any): Promise<any> {
            switch (request.descriptor) {
              case EXCHANGE_SESSION_AND_CHECK_CAPABILITY:
                return {
                  userSession: {
                    accountId: "consumer1",
                  },
                  canConsumeShows: true,
                } as ExchangeSessionAndCheckCapabilityResponse;
              case GET_CONTINUE_EPISODE:
                return {
                  episodeId: "ep5",
                  continueTimestamp: 500,
                } as GetContinueEpisodeResponse;
              case GET_ACCOUNT_SNAPSHOT:
                return {
                  account: {
                    accountId: "publisher1",
                    avatarSmallUrl: "publisher_avatar.jpg",
                    naturalName: "A Publisher",
                  },
                } as GetAccountSnapshotResponse;
              default:
                throw new Error("Expected");
            }
          }
        })();
        let handler = new GetSeasonDetailsHandler(
          SPANNER_DATABASE,
          new FakeBucket() as any,
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
          containStr("Season season1 episode ep5 may be deleted"),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
  ],
});
