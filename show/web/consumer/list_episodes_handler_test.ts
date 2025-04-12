import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertEpisodeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { ListEpisodesHandler } from "./list_episodes_handler";
import {
  GET_LATEST_WATCHED_TIME_OF_EPISODE,
  GET_LATEST_WATCHED_TIME_OF_EPISODE_REQUEST_BODY,
  GetLatestWatchedTimeOfEpisodeResponse,
} from "@phading/play_activity_service_interface/show/node/interface";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { LIST_EPISODES_RESPONSE } from "@phading/product_service_interface/show/web/consumer/interface";
import {
  FETCH_SESSION_AND_CHECK_CAPABILITY,
  FetchSessionAndCheckCapabilityResponse,
} from "@phading/user_session_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "ListEpisodesHandlerTest",
  cases: [
    {
      name: "ListNextUntilEnd",
      execute: async () => {
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
              name: "Ep 1",
              index: 1,
              videoContainer: {
                durationSec: 60,
              },
              state: EpisodeState.PUBLISHED,
              premierTimeMs: 1000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              name: "Ep 2",
              index: 2,
              videoContainer: {
                durationSec: 120,
              },
              state: EpisodeState.PUBLISHED,
              premierTimeMs: 2000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              name: "Ep 3",
              index: 3,
              videoContainer: {
                durationSec: 180,
              },
              state: EpisodeState.PUBLISHED,
              premierTimeMs: 3000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode4",
              name: "Ep 4",
              index: 4,
              videoContainer: {
                durationSec: 240,
              },
              state: EpisodeState.DRAFT,
              premierTimeMs: 4000,
            }),
          ]);
          await transaction.commit();
        });
        let requests: any[] = [];
        let serviceClientMock = new (class extends NodeServiceClientMock {
          public async send(request: any): Promise<any> {
            switch (request.descriptor) {
              case FETCH_SESSION_AND_CHECK_CAPABILITY:
                return {
                  accountId: "account1",
                  capabilities: {
                    canConsume: true,
                  },
                } as FetchSessionAndCheckCapabilityResponse;
              case GET_LATEST_WATCHED_TIME_OF_EPISODE:
                requests.push(request.body);
                return {
                  episodeIndex: 1,
                  watchedTimeMs: 60,
                } as GetLatestWatchedTimeOfEpisodeResponse;
            }
          }
        })();
        let handler = new ListEpisodesHandler(
          SPANNER_DATABASE,
          serviceClientMock,
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            seasonId: "season1",
            next: true,
            limit: 2,
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              episodes: [
                {
                  episodeId: "episode1",
                  name: "Ep 1",
                  index: 1,
                  videoDurationSec: 60,
                  premierTimeMs: 1000,
                  continueTimeMs: 60,
                },
                {
                  episodeId: "episode2",
                  name: "Ep 2",
                  index: 2,
                  videoDurationSec: 120,
                  premierTimeMs: 2000,
                  continueTimeMs: 60,
                },
              ],
              indexCursor: 2,
            },
            LIST_EPISODES_RESPONSE,
          ),
          "response",
        );
        assertThat(
          requests,
          isArray([
            eqMessage(
              {
                watcherId: "account1",
                seasonId: "season1",
                episodeId: "episode1",
              },
              GET_LATEST_WATCHED_TIME_OF_EPISODE_REQUEST_BODY,
            ),
            eqMessage(
              {
                watcherId: "account1",
                seasonId: "season1",
                episodeId: "episode2",
              },
              GET_LATEST_WATCHED_TIME_OF_EPISODE_REQUEST_BODY,
            ),
          ]),
          "GetLatestWatchedTimeOfEpisodeRequest",
        );

        // Prepare
        requests.length = 0;

        // Execute
        response = await handler.handle(
          "",
          {
            seasonId: "season1",
            next: true,
            indexCursor: 2,
            limit: 2,
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              episodes: [
                {
                  episodeId: "episode3",
                  name: "Ep 3",
                  index: 3,
                  videoDurationSec: 180,
                  premierTimeMs: 3000,
                  continueTimeMs: 60,
                },
              ],
            },
            LIST_EPISODES_RESPONSE,
          ),
          "response 2",
        );
        assertThat(
          requests,
          isArray([
            eqMessage(
              {
                watcherId: "account1",
                seasonId: "season1",
                episodeId: "episode3",
              },
              GET_LATEST_WATCHED_TIME_OF_EPISODE_REQUEST_BODY,
            ),
          ]),
          "GetLatestWatchedTimeOfEpisodeRequest 2",
        );
      },
      tearDown: async () => {
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
      name: "ListPrevUntilEnd",
      execute: async () => {
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
              name: "Ep 1",
              index: 1,
              videoContainer: {
                durationSec: 60,
              },
              state: EpisodeState.PUBLISHED,
              premierTimeMs: 1000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              name: "Ep 2",
              index: 2,
              videoContainer: {
                durationSec: 120,
              },
              state: EpisodeState.PUBLISHED,
              premierTimeMs: 2000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              name: "Ep 3",
              index: 3,
              videoContainer: {
                durationSec: 180,
              },
              state: EpisodeState.PUBLISHED,
              premierTimeMs: 3000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode4",
              name: "Ep 4",
              index: 4,
              videoContainer: {
                durationSec: 240,
              },
              state: EpisodeState.DRAFT,
              premierTimeMs: 4000,
            }),
          ]);
          await transaction.commit();
        });
        let requests: any[] = [];
        let serviceClientMock = new (class extends NodeServiceClientMock {
          public async send(request: any): Promise<any> {
            switch (request.descriptor) {
              case FETCH_SESSION_AND_CHECK_CAPABILITY:
                return {
                  accountId: "account1",
                  capabilities: {
                    canConsume: true,
                  },
                } as FetchSessionAndCheckCapabilityResponse;
              case GET_LATEST_WATCHED_TIME_OF_EPISODE:
                requests.push(request.body);
                return {
                  episodeIndex: 1,
                  watchedTimeMs: 60,
                } as GetLatestWatchedTimeOfEpisodeResponse;
            }
          }
        })();
        let handler = new ListEpisodesHandler(
          SPANNER_DATABASE,
          serviceClientMock,
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            seasonId: "season1",
            next: false,
            limit: 2,
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              episodes: [
                {
                  episodeId: "episode3",
                  name: "Ep 3",
                  index: 3,
                  videoDurationSec: 180,
                  premierTimeMs: 3000,
                  continueTimeMs: 60,
                },
                {
                  episodeId: "episode2",
                  name: "Ep 2",
                  index: 2,
                  videoDurationSec: 120,
                  premierTimeMs: 2000,
                  continueTimeMs: 60,
                },
              ],
              indexCursor: 2,
            },
            LIST_EPISODES_RESPONSE,
          ),
          "response",
        );
        assertThat(
          requests,
          isArray([
            eqMessage(
              {
                watcherId: "account1",
                seasonId: "season1",
                episodeId: "episode3",
              },
              GET_LATEST_WATCHED_TIME_OF_EPISODE_REQUEST_BODY,
            ),
            eqMessage(
              {
                watcherId: "account1",
                seasonId: "season1",
                episodeId: "episode2",
              },
              GET_LATEST_WATCHED_TIME_OF_EPISODE_REQUEST_BODY,
            ),
          ]),
          "GetLatestWatchedTimeOfEpisodeRequest",
        );

        // Prepare
        requests.length = 0;

        // Execute
        response = await handler.handle(
          "",
          {
            seasonId: "season1",
            next: false,
            indexCursor: 2,
            limit: 2,
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              episodes: [
                {
                  episodeId: "episode1",
                  name: "Ep 1",
                  index: 1,
                  videoDurationSec: 60,
                  premierTimeMs: 1000,
                  continueTimeMs: 60,
                },
              ],
            },
            LIST_EPISODES_RESPONSE,
          ),
          "response 2",
        );
        assertThat(
          requests,
          isArray([
            eqMessage(
              {
                watcherId: "account1",
                seasonId: "season1",
                episodeId: "episode1",
              },
              GET_LATEST_WATCHED_TIME_OF_EPISODE_REQUEST_BODY,
            ),
          ]),
          "GetLatestWatchedTimeOfEpisodeRequest 2",
        );
      },
      tearDown: async () => {
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
      name: "SeasonNotPublished",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              state: SeasonState.DRAFT,
              createdTimeMs: 1000,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
          capabilities: {
            canConsume: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new ListEpisodesHandler(
          SPANNER_DATABASE,
          serviceClientMock,
        );

        // Execute
        let response = await handler.handle(
          "",
          { seasonId: "season1", next: true, limit: 2 },
          "sessionStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              episodes: [],
            },
            LIST_EPISODES_RESPONSE,
          ),
          "response",
        );
      },
      tearDown: async () => {
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
