import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { deleteSeasonStatement, insertEpisodeStatement, insertSeasonStatement } from "../../../db/sql";
import { GetContinueEpisodeHandler } from "./get_continue_episode_handler";
import {
  GET_LATEST_WATCHED_EPISODE,
  GetLatestWatchedEpisodeResponse,
} from "@phading/play_activity_service_interface/show/node/interface";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { GET_CONTINUE_EPISODE_RESPONSE } from "@phading/product_service_interface/show/web/consumer/interface";
import {
  EXCHANGE_SESSION_AND_CHECK_CAPABILITY,
  ExchangeSessionAndCheckCapabilityResponse,
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
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 10,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              name: "episode1",
              videoContainer: {
                durationSec: 120,
              },
              premierTimeMs: 10,
              publishTimeMs: 20,
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
              case EXCHANGE_SESSION_AND_CHECK_CAPABILITY:
                return {
                  accountId: "account1",
                  capabilities: {
                    canConsumeShows: true,
                  },
                } as ExchangeSessionAndCheckCapabilityResponse;
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
          () => 1000,
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
              episode: {
                episodeId: "episode1",
                name: "episode1",
                index: 1,
                videoDurationSec: 120,
                premierTimeMs: 10,
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
            deleteSeasonStatement("season1"),
          ]);
          await transaction.commit();
        });
      },
    },
    // More cases are covered in ListContinueEpisodesHandlerTest.
  ],
});
