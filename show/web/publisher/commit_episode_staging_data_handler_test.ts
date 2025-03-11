import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_SEASON_ROW,
  deleteSeasonStatement,
  getSeason,
  insertEpisodeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { CommitEpisodeStagingDataHandler } from "./commit_episode_staging_data_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import {
  COMMIT_EPISODE_STAGING_DATA_RESPONSE,
  ValidationError,
} from "@phading/product_service_interface/show/web/publisher/interface";
import {
  EXCHANGE_SESSION_AND_CHECK_CAPABILITY,
  ExchangeSessionAndCheckCapabilityResponse,
} from "@phading/user_session_service_interface/node/interface";
import {
  COMMIT_VIDEO_CONTAINER_STAGING_DATA,
  COMMIT_VIDEO_CONTAINER_STAGING_DATA_REQUEST_BODY,
  CommitVideoContainerStagingDataResponse,
} from "@phading/video_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "CommitEpisodeStagingDataHandlerTest",
  cases: [
    {
      name: "Success",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              videoContainerId: "videoContainer1",
              publishTimeMs: 200,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new (class extends NodeServiceClientMock {
          public async send(request: any): Promise<any> {
            this.request = request;
            switch (request.descriptor) {
              case EXCHANGE_SESSION_AND_CHECK_CAPABILITY:
                return {
                  accountId: "publisher1",
                  capabilities: {
                    canPublishShows: true,
                  },
                } as ExchangeSessionAndCheckCapabilityResponse;
              case COMMIT_VIDEO_CONTAINER_STAGING_DATA:
                this.request = request;
                return {
                  success: false,
                  error: ValidationError.TOO_MANY_AUDIO_TRACKS,
                } as CommitVideoContainerStagingDataResponse;
              default:
                throw new Error(`Unexpected`);
            }
          }
        })();
        let handler = new CommitEpisodeStagingDataHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "episode1",
          },
          "session1",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              success: false,
              error: ValidationError.TOO_MANY_AUDIO_TRACKS,
            },
            COMMIT_EPISODE_STAGING_DATA_RESPONSE,
          ),
          "response",
        );
        assertThat(
          serviceClientMock.request.body,
          eqMessage(
            { containerId: "videoContainer1" },
            COMMIT_VIDEO_CONTAINER_STAGING_DATA_REQUEST_BODY,
          ),
          "RC body",
        );
        assertThat(
          await getSeason(SPANNER_DATABASE, "season1"),
          isArray([
            eqMessage(
              {
                seasonData: {
                  seasonId: "season1",
                  publisherId: "publisher1",
                  state: SeasonState.PUBLISHED,
                  lastChangeTimeMs: 1000,
                  recentPremierTimeMs: 100,
                },
              },
              GET_SEASON_ROW,
            ),
          ]),
          "season",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([deleteSeasonStatement("season1")]);
          await transaction.commit();
        });
      },
    },
  ],
});
