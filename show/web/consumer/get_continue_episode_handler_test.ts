import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertEpisodeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { GetContinueEpisodeHandler } from "./get_continue_episode_handler";
import {
  GET_LATEST_WATCHED_EPISODE,
  GetLatestWatchedEpisodeResponse,
} from "@phading/play_activity_service_interface/show/node/interface";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { GET_CONTINUE_EPISODE_RESPONSE } from "@phading/product_service_interface/show/web/consumer/interface";
import {
  FETCH_SESSION_AND_CHECK_CAPABILITY,
  FetchSessionAndCheckCapabilityResponse,
} from "@phading/user_session_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeClientOptions } from "@selfage/node_service_client";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { ClientRequestInterface } from "@selfage/service_descriptor/client_request_interface";
import { assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "GetContinueEpisodeHandlerTest",
  cases: [
    {
      name: "GetLatestEpisode",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              state: SeasonState.PUBLISHED,
              createdTimeMs: 1000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              name: "episode1",
              videoContainer: {
                durationSec: 120,
              },
              premiereTimeMs: 10,
              state: EpisodeState.PUBLISHED,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new (class extends NodeServiceClientMock {
          public async send(
            request: ClientRequestInterface<any>,
            options?: NodeClientOptions,
          ): Promise<any> {
            switch (request.descriptor) {
              case FETCH_SESSION_AND_CHECK_CAPABILITY:
                return {
                  accountId: "account1",
                  capabilities: {
                    canConsume: true,
                  },
                } as FetchSessionAndCheckCapabilityResponse;
              case GET_LATEST_WATCHED_EPISODE:
                this.request = request;
                return {
                  episodeId: "episode1",
                  episodeIndex: 1,
                  watchedTimeMs: 60,
                } as GetLatestWatchedEpisodeResponse;
            }
          }
        })();
        let handler = new GetContinueEpisodeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
        );

        // Execute
        let response = await handler.handle(
          "",
          { seasonId: "season1" },
          "session1",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              continue: {
                episode: {
                  episodeId: "episode1",
                  name: "episode1",
                  index: 1,
                  videoDurationSec: 120,
                  premiereTimeMs: 10,
                },
                continueTimeMs: 60,
              },
            },
            GET_CONTINUE_EPISODE_RESPONSE,
          ),
          "GetContinueEpisodeResponse",
        );
      },
      async tearDown() {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({
              seasonSeasonIdEq: "season1",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "NoLatestEpisode_StartFromFirstEpisode",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              state: SeasonState.PUBLISHED,
              createdTimeMs: 1000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              name: "episode1",
              videoContainer: {
                durationSec: 120,
              },
              premiereTimeMs: 10,
              state: EpisodeState.PUBLISHED,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new (class extends NodeServiceClientMock {
          public async send(
            request: ClientRequestInterface<any>,
            options?: NodeClientOptions,
          ): Promise<any> {
            switch (request.descriptor) {
              case FETCH_SESSION_AND_CHECK_CAPABILITY:
                return {
                  accountId: "account1",
                  capabilities: {
                    canConsume: true,
                  },
                } as FetchSessionAndCheckCapabilityResponse;
              case GET_LATEST_WATCHED_EPISODE:
                this.request = request;
                return {} as GetLatestWatchedEpisodeResponse;
            }
          }
        })();
        let handler = new GetContinueEpisodeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
        );

        // Execute
        let response = await handler.handle(
          "",
          { seasonId: "season1" },
          "session1",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              continue: {
                episode: {
                  episodeId: "episode1",
                  name: "episode1",
                  index: 1,
                  videoDurationSec: 120,
                  premiereTimeMs: 10,
                },
                continueTimeMs: 0,
              },
            },
            GET_CONTINUE_EPISODE_RESPONSE,
          ),
          "GetContinueEpisodeResponse",
        );
      },
      async tearDown() {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({
              seasonSeasonIdEq: "season1",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
