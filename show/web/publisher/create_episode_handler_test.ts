import "../../../local/env";
import { FAR_FUTURE_TIME_MS } from "../../../common/constants";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_SEASON_ROW,
  GET_VIDEO_CONTAINER_CREATING_TASK_ROW,
  LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
  deleteSeasonStatement,
  deleteVideoContainerCreatingTaskStatement,
  getSeason,
  getVideoContainerCreatingTask,
  insertSeasonStatement,
  listNextEpisodesForPublisher,
} from "../../../db/sql";
import { CreateEpisodeHandler } from "./create_episode_handler";
import { MAX_NUM_OF_EPISODES_PER_SEASON } from "@phading/constants/show";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { CREATE_EPISODE_RESPONSE } from "@phading/product_service_interface/show/web/publisher/interface";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { newBadRequestError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "CreateEpisodeHandlerTest",
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
              state: SeasonState.DRAFT,
              totalEpisodes: 0,
              lastChangeTimeMs: 0,
              recentPremierTimeMs: 0,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublishShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new CreateEpisodeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
          () => "episode1",
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeName: "Ep 1",
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              episode: {
                episodeId: "episode1",
                index: 1,
                name: "Ep 1",
                publishTimeMs: FAR_FUTURE_TIME_MS,
                premierTimeMs: FAR_FUTURE_TIME_MS,
              },
            },
            CREATE_EPISODE_RESPONSE,
          ),
          "response",
        );
        assertThat(
          await getSeason(SPANNER_DATABASE, "season1"),
          isArray([
            eqMessage(
              {
                seasonData: {
                  seasonId: "season1",
                  publisherId: "publisher1",
                  state: SeasonState.DRAFT,
                  totalEpisodes: 1,
                  lastChangeTimeMs: 1000,
                  recentPremierTimeMs: 0,
                },
              },
              GET_SEASON_ROW,
            ),
          ]),
          "season",
        );
        assertThat(
          await listNextEpisodesForPublisher(
            SPANNER_DATABASE,
            "publisher1",
            "season1",
            0,
            2,
          ),
          isArray([
            eqMessage(
              {
                eData: {
                  seasonId: "season1",
                  episodeId: "episode1",
                  index: 1,
                  name: "Ep 1",
                  publishTimeMs: FAR_FUTURE_TIME_MS,
                  premierTimeMs: FAR_FUTURE_TIME_MS,
                },
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
          ]),
          "episodes",
        );
        assertThat(
          await getVideoContainerCreatingTask(
            SPANNER_DATABASE,
            "season1",
            "episode1",
          ),
          isArray([
            eqMessage(
              {
                videoContainerCreatingTaskSeasonId: "season1",
                videoContainerCreatingTaskEpisodeId: "episode1",
                videoContainerCreatingTaskRetryCount: 0,
                videoContainerCreatingTaskExecutionTimeMs: 1000,
                videoContainerCreatingTaskCreatedTimeMs: 1000,
              },
              GET_VIDEO_CONTAINER_CREATING_TASK_ROW,
            ),
          ]),
          "tasks",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement("season1"),
            deleteVideoContainerCreatingTaskStatement("season1", "episode1"),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "TooManyEpisodes",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.DRAFT,
              totalEpisodes: MAX_NUM_OF_EPISODES_PER_SEASON,
              lastChangeTimeMs: 0,
              recentPremierTimeMs: 0,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublishShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new CreateEpisodeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
          () => "episode1",
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              episodeName: "Ep 1",
            },
            "sessionStr",
          ),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newBadRequestError(
              `Season season1 already has maximum number of episodes.`,
            ),
          ),
          "error",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement("season1"),
            deleteVideoContainerCreatingTaskStatement("season1", "episode1"),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "SeasonArchived",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.ARCHIVED,
              totalEpisodes: 0,
              lastChangeTimeMs: 0,
              recentPremierTimeMs: 0,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublishShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new CreateEpisodeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
          () => "episode1",
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              episodeName: "Ep 1",
            },
            "sessionStr",
          ),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newBadRequestError(
              `Season season1 is archived and cannot create new episode.`,
            ),
          ),
          "error",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement("season1"),
            deleteVideoContainerCreatingTaskStatement("season1", "episode1"),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
