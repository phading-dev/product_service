import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_EPISODE_ROW,
  GET_SEASON_RECENT_PREMIER_TIME_UPDATING_TASK_ROW,
  GET_SEASON_ROW,
  deleteSeasonRecentPremierTimeUpdatingTaskStatement,
  deleteSeasonStatement,
  getEpisode,
  getSeason,
  getSeasonRecentPremierTimeUpdatingTask,
  insertEpisodeStatement,
  insertSeasonRecentPremierTimeUpdatingTaskStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { PublishEpisodeHandler } from "./publish_episode_handler";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { newBadRequestError, newNotFoundError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "PublishEpisodeHandlerTest",
  cases: [
    {
      name: "PublishWithoutPremierTimeAndAlsoPublishDraftSeason",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.DRAFT,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
              createdTimeMs: 1000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              videoContainer: {},
              state: EpisodeState.DRAFT,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublish: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new PublishEpisodeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "episode1",
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          await getSeason(SPANNER_DATABASE, { seasonSeasonIdEq: "season1" }),
          isArray([
            eqMessage(
              {
                seasonSeasonId: "season1",
                seasonPublisherId: "publisher1",
                seasonState: SeasonState.PUBLISHED,
                seasonLastChangeTimeMs: 1000,
                seasonRecentPremierTimeMs: 100,
                seasonCreatedTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "season",
        );
        assertThat(
          await getEpisode(SPANNER_DATABASE, {
            episodeSeasonIdEq: "season1",
            episodeEpisodeIdEq: "episode1",
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode1",
                episodeIndex: 1,
                episodeVideoContainer: {},
                episodeState: EpisodeState.PUBLISHED,
                episodePremierTimeMs: 1000,
              },
              GET_EPISODE_ROW,
            ),
          ]),
          "episode",
        );
        assertThat(
          await getSeasonRecentPremierTimeUpdatingTask(SPANNER_DATABASE, {
            seasonRecentPremierTimeUpdatingTaskSeasonIdEq: "season1",
            seasonRecentPremierTimeUpdatingTaskEpisodeIdEq: "episode1",
          }),
          isArray([
            eqMessage(
              {
                seasonRecentPremierTimeUpdatingTaskSeasonId: "season1",
                seasonRecentPremierTimeUpdatingTaskEpisodeId: "episode1",
                seasonRecentPremierTimeUpdatingTaskRetryCount: 0,
                seasonRecentPremierTimeUpdatingTaskExecutionTimeMs: 1000,
                seasonRecentPremierTimeUpdatingTaskCreatedTimeMs: 1000,
              },
              GET_SEASON_RECENT_PREMIER_TIME_UPDATING_TASK_ROW,
            ),
          ]),
          "task",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
            deleteSeasonRecentPremierTimeUpdatingTaskStatement({
              seasonRecentPremierTimeUpdatingTaskSeasonIdEq: "season1",
              seasonRecentPremierTimeUpdatingTaskEpisodeIdEq: "episode1",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "PublishWithPremierTimeAndSeasonAlreadyPublishedAndRecentPremierTimeUpdatingTask",
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
              createdTimeMs: 1000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              videoContainer: {},
              state: EpisodeState.PUBLISHED,
              premierTimeMs: 200,
            }),
            insertSeasonRecentPremierTimeUpdatingTaskStatement({
              seasonId: "season1",
              episodeId: "episode1",
              retryCount: 0,
              executionTimeMs: 3000,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublish: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new PublishEpisodeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "episode1",
            premierTimeMs: 2000,
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          await getSeason(SPANNER_DATABASE, { seasonSeasonIdEq: "season1" }),
          isArray([
            eqMessage(
              {
                seasonSeasonId: "season1",
                seasonPublisherId: "publisher1",
                seasonState: SeasonState.PUBLISHED,
                seasonLastChangeTimeMs: 1000,
                seasonRecentPremierTimeMs: 100,
                seasonCreatedTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "season",
        );
        assertThat(
          await getEpisode(SPANNER_DATABASE, {
            episodeSeasonIdEq: "season1",
            episodeEpisodeIdEq: "episode1",
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode1",
                episodeIndex: 1,
                episodeVideoContainer: {},
                episodeState: EpisodeState.PUBLISHED,
                episodePremierTimeMs: 2000,
              },
              GET_EPISODE_ROW,
            ),
          ]),
          "episode",
        );
        assertThat(
          await getSeasonRecentPremierTimeUpdatingTask(SPANNER_DATABASE, {
            seasonRecentPremierTimeUpdatingTaskSeasonIdEq: "season1",
            seasonRecentPremierTimeUpdatingTaskEpisodeIdEq: "episode1",
          }),
          isArray([
            eqMessage(
              {
                seasonRecentPremierTimeUpdatingTaskSeasonId: "season1",
                seasonRecentPremierTimeUpdatingTaskEpisodeId: "episode1",
                seasonRecentPremierTimeUpdatingTaskRetryCount: 0,
                seasonRecentPremierTimeUpdatingTaskExecutionTimeMs: 2000,
                seasonRecentPremierTimeUpdatingTaskCreatedTimeMs: 1000,
              },
              GET_SEASON_RECENT_PREMIER_TIME_UPDATING_TASK_ROW,
            ),
          ]),
          "task",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
            deleteSeasonRecentPremierTimeUpdatingTaskStatement({
              seasonRecentPremierTimeUpdatingTaskSeasonIdEq: "season1",
              seasonRecentPremierTimeUpdatingTaskEpisodeIdEq: "episode1",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "VideoContainerNotAvailable",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.DRAFT,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
              createdTimeMs: 1000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              state: EpisodeState.DRAFT,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublish: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new PublishEpisodeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              episodeId: "episode1",
            },
            "sessionStr",
          ),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newBadRequestError(
              "Video container is not committed yet for season season1 episode episode1.",
            ),
          ),
          "error",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "EpisodeNotOwned",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.DRAFT,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
              createdTimeMs: 1000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              videoContainer: {},
              state: EpisodeState.DRAFT,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher2",
          capabilities: {
            canPublish: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new PublishEpisodeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              episodeId: "episode1",
            },
            "sessionStr",
          ),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newNotFoundError(
              "Season season1 or episode episode1 is not found.",
            ),
          ),
          "error",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
