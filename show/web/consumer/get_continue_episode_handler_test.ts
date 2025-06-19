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

async function insertEpisodes() {
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
        name: "Episode 1",
        videoContainerCached: {
          durationSec: 120,
          resolution: "1080p",
        },
        premiereTimeMs: 100,
        state: EpisodeState.PUBLISHED,
      }),
      insertEpisodeStatement({
        seasonId: "season1",
        episodeId: "episode2",
        index: 2,
        name: "Episode 2",
        videoContainerCached: {
          durationSec: 150,
          resolution: "1080p",
        },
        premiereTimeMs: 200,
        state: EpisodeState.PUBLISHED,
      }),
      insertEpisodeStatement({
        seasonId: "season1",
        episodeId: "episode3",
        index: 3,
        name: "Episode 3",
        videoContainerCached: {
          durationSec: 180,
          resolution: "1080p",
        },
        premiereTimeMs: 300,
        state: EpisodeState.PUBLISHED,
      }),
      insertEpisodeStatement({
        seasonId: "season1",
        episodeId: "episode4",
        index: 4,
        name: "Episode 4",
        videoContainerCached: {
          durationSec: 200,
          resolution: "1080p",
        },
        premiereTimeMs: 400,
        state: EpisodeState.DRAFT,
      }),
    ]);
    await transaction.commit();
  });
}

async function deleteSeason() {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    await transaction.batchUpdate([
      deleteSeasonStatement({
        seasonSeasonIdEq: "season1",
      }),
    ]);
    await transaction.commit();
  });
}

TEST_RUNNER.run({
  name: "GetContinueEpisodeHandlerTest",
  cases: [
    {
      name: "NoEpisodeWatched_StartFromFirstEpisode",
      async execute() {
        // Prepare
        await insertEpisodes();
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
          () => 100,
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
                name: "Episode 1",
                index: 1,
                videoDurationSec: 120,
                resolution: "1080p",
                premiereTimeMs: 100,
                canPlay: true,
              },
              rewatching: false,
            },
            GET_CONTINUE_EPISODE_RESPONSE,
          ),
          "GetContinueEpisodeResponse",
        );
      },
      async tearDown() {
        await deleteSeason();
      },
    },
    {
      name: "LatestWatchedEpisodeNotPublished_StartFromFirstEpisode",
      async execute() {
        // Prepare
        await insertEpisodes();
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
                  episodeId: "episode4",
                } as GetLatestWatchedEpisodeResponse;
            }
          }
        })();
        let handler = new GetContinueEpisodeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 100,
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
                name: "Episode 1",
                index: 1,
                videoDurationSec: 120,
                resolution: "1080p",
                premiereTimeMs: 100,
                canPlay: true,
              },
              rewatching: false,
            },
            GET_CONTINUE_EPISODE_RESPONSE,
          ),
          "GetContinueEpisodeResponse",
        );
      },
      async tearDown() {
        await deleteSeason();
      },
    },
    {
      name: "ContinueFromLatestWatchedEpisode",
      async execute() {
        // Prepare
        await insertEpisodes();
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
                  episodeId: "episode2",
                  watchedVideoTimeMs: 60000,
                } as GetLatestWatchedEpisodeResponse;
            }
          }
        })();
        let handler = new GetContinueEpisodeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 200,
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
                episodeId: "episode2",
                name: "Episode 2",
                index: 2,
                videoDurationSec: 150,
                resolution: "1080p",
                premiereTimeMs: 200,
                canPlay: true,
              },
              rewatching: false,
            },
            GET_CONTINUE_EPISODE_RESPONSE,
          ),
          "GetContinueEpisodeResponse",
        );
      },
      async tearDown() {
        await deleteSeason();
      },
    },
    {
      name: "LatestWatchedEpisodeCompleted_ContinueAtTheNextEpisode",
      async execute() {
        // Prepare
        await insertEpisodes();
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
                  episodeId: "episode2",
                  watchedVideoTimeMs: 136000,
                } as GetLatestWatchedEpisodeResponse;
            }
          }
        })();
        let handler = new GetContinueEpisodeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 200,
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
                episodeId: "episode3",
                name: "Episode 3",
                index: 3,
                videoDurationSec: 180,
                resolution: "1080p",
                premiereTimeMs: 300,
                canPlay: false,
              },
              rewatching: false,
            },
            GET_CONTINUE_EPISODE_RESPONSE,
          ),
          "GetContinueEpisodeResponse",
        );
      },
      async tearDown() {
        await deleteSeason();
      },
    },
    {
      name: "LatestWatchedEpisodeCompleted_NoNextEpisode_StartFromFirstEpisode",
      async execute() {
        // Prepare
        await insertEpisodes();
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
                  episodeId: "episode3",
                  watchedVideoTimeMs: 179000,
                } as GetLatestWatchedEpisodeResponse;
            }
          }
        })();
        let handler = new GetContinueEpisodeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 200,
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
                name: "Episode 1",
                index: 1,
                videoDurationSec: 120,
                resolution: "1080p",
                premiereTimeMs: 100,
                canPlay: true,
              },
              rewatching: true,
            },
            GET_CONTINUE_EPISODE_RESPONSE,
          ),
          "GetContinueEpisodeResponse",
        );
      },
      async tearDown() {
        await deleteSeason();
      },
    },
  ],
});
