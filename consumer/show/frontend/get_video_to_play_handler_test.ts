import { FakeBucket } from "../../../common/cloud_storage_fake";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertEpisodeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { GetVideoToPlayHandler } from "./get_video_to_play_handler";
import { Statement } from "@google-cloud/spanner/build/src/transaction";
import { GET_VIDEO_TO_PLAY_RESPONSE } from "@phading/product_service_interface/consumer/show/frontend/interface";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import {
  GET_CONTINUE_TIMESTAMP_FOR_EPISODE,
  GET_CONTINUE_TIMESTAMP_FOR_EPISODE_REQUEST_BODY,
  GetContinueTimestampForEpisodeResponse,
} from "@phading/user_activity_service_interface/consumer/show/backend/interface";
import {
  EXCHANGE_SESSION_AND_CHECK_CAPABILITY,
  ExchangeSessionAndCheckCapabilityResponse,
} from "@phading/user_session_service_interface/backend/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat, containStr } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

async function insertSeasonAndEpisodes(
  num: number,
  state: SeasonState,
): Promise<void> {
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
        state,
        num,
      ),
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
  name: "GetVideoToPlayHandlerTest",
  cases: [
    {
      name: "NoContinueTimestamp",
      execute: async () => {
        // Prepare
        await insertSeasonAndEpisodes(5, SeasonState.PUBLISHED);
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
              case GET_CONTINUE_TIMESTAMP_FOR_EPISODE:
                assertThat(
                  request.body,
                  eqMessage(
                    {
                      seasonId: "season1",
                      episodeId: "ep3",
                    },
                    GET_CONTINUE_TIMESTAMP_FOR_EPISODE_REQUEST_BODY,
                  ),
                  "GET_CONTINUE_EPISODE_REQUEST_BODY",
                );
                return {} as GetContinueTimestampForEpisodeResponse;
              default:
                throw new Error("Expected");
            }
          }
        })();
        let handler = new GetVideoToPlayHandler(
          SPANNER_DATABASE,
          new FakeBucket() as any,
          clientMock,
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "ep3",
          },
          "session1",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              videoUrl: "video3",
              continueTimestamp: 0,
            },
            GET_VIDEO_TO_PLAY_RESPONSE,
          ),
          "response",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "WithContinueTimestamp",
      execute: async () => {
        // Prepare
        await insertSeasonAndEpisodes(5, SeasonState.PUBLISHED);
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
              case GET_CONTINUE_TIMESTAMP_FOR_EPISODE:
                return {
                  continueTimestamp: 500,
                } as GetContinueTimestampForEpisodeResponse;
              default:
                throw new Error("Expected");
            }
          }
        })();
        let handler = new GetVideoToPlayHandler(
          SPANNER_DATABASE,
          new FakeBucket() as any,
          clientMock,
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "ep3",
          },
          "session1",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              videoUrl: "video3",
              continueTimestamp: 500,
            },
            GET_VIDEO_TO_PLAY_RESPONSE,
          ),
          "response",
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
        await insertSeasonAndEpisodes(5, SeasonState.DRAFT);
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
              case GET_CONTINUE_TIMESTAMP_FOR_EPISODE:
                return {} as GetContinueTimestampForEpisodeResponse;
              default:
                throw new Error("Expected");
            }
          }
        })();
        let handler = new GetVideoToPlayHandler(
          SPANNER_DATABASE,
          new FakeBucket() as any,
          clientMock,
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              episodeId: "ep3",
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr("Season season1 episode ep3 is not found"),
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
        await insertSeasonAndEpisodes(5, SeasonState.PUBLISHED);
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
              case GET_CONTINUE_TIMESTAMP_FOR_EPISODE:
                return {} as GetContinueTimestampForEpisodeResponse;
              default:
                throw new Error("Expected");
            }
          }
        })();
        let handler = new GetVideoToPlayHandler(
          SPANNER_DATABASE,
          new FakeBucket() as any,
          clientMock,
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              episodeId: "ep10",
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr("Season season1 episode ep10 is not found"),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
  ],
});
