import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertEpisodeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { GetEpisodeHandler } from "./get_episode_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { GET_EPISODE_RESPONSE } from "@phading/product_service_interface/show/web/publisher/interface";
import {
  EXCHANGE_SESSION_AND_CHECK_CAPABILITY,
  ExchangeSessionAndCheckCapabilityResponse,
} from "@phading/user_session_service_interface/node/interface";
import {
  GET_VIDEO_CONTAINER,
  GET_VIDEO_CONTAINER_REQUEST_BODY,
  GetVideoContainerResponse,
} from "@phading/video_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "GetEpisodeHandlerTest",
  cases: [
    {
      name: "WithVideoContainer",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              name: "Season 1",
              state: SeasonState.PUBLISHED,
              lastChangeTimeMs: 100,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              name: "Ep 1",
              videoContainerId: "videoContainer1",
              publishTimeMs: 200,
              premierTimeMs: 300,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new (class extends NodeServiceClientMock {
          public async send(request: any): Promise<any> {
            switch (request.descriptor) {
              case EXCHANGE_SESSION_AND_CHECK_CAPABILITY:
                return {
                  accountId: "publisher1",
                  canPublishShows: true,
                } as ExchangeSessionAndCheckCapabilityResponse;
              case GET_VIDEO_CONTAINER:
                this.request = request;
                return {
                  videoContainer: {
                    masterPlaylist: {
                      synced: {
                        version: 1,
                      },
                    },
                  },
                } as GetVideoContainerResponse;
              default:
                throw new Error(`Unexpected.`);
            }
          }
        })();
        let handler = new GetEpisodeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
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
              episode: {
                seasonName: "Season 1",
                episodeName: "Ep 1",
                episodeIndex: 1,
                videoContainer: {
                  masterPlaylist: {
                    synced: {
                      version: 1,
                    },
                  },
                },
                publishTimeMs: 200,
                premierTimeMs: 300,
              },
            },
            GET_EPISODE_RESPONSE,
          ),
          "response",
        );
        assertThat(
          serviceClientMock.request.body,
          eqMessage(
            {
              containerId: "videoContainer1",
            },
            GET_VIDEO_CONTAINER_REQUEST_BODY,
          ),
          "RC body",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([deleteSeasonStatement("season1")]);
          await transaction.commit();
        });
      },
    },
    {
      name: "WithoutVideoContainer",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              name: "Season 1",
              state: SeasonState.PUBLISHED,
              lastChangeTimeMs: 100,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              name: "Ep 1",
              publishTimeMs: 200,
              premierTimeMs: 300,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new GetEpisodeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
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
              episode: {
                seasonName: "Season 1",
                episodeName: "Ep 1",
                episodeIndex: 1,
                publishTimeMs: 200,
                premierTimeMs: 300,
              },
            },
            GET_EPISODE_RESPONSE,
          ),
          "response",
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
