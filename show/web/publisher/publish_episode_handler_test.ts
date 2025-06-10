import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_EPISODE_ROW,
  GET_SEASON_RECENT_PREMIERE_TIME_UPDATING_TASK_ROW,
  GET_SEASON_ROW,
  deleteSeasonRecentPremiereTimeUpdatingTasksOfSeasonStatement,
  deleteSeasonStatement,
  getEpisode,
  getSeason,
  getSeasonRecentPremiereTimeUpdatingTaskMetadata,
  insertEpisodeStatement,
  insertSeasonRecentPremiereTimeUpdatingTaskStatement,
  insertSeasonStatement,
  listPendingSeasonRecentPremiereTimeUpdatingTasks,
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
      name: "PublishWithoutPremiereTimeAndAlsoPublishDraftSeason",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.DRAFT,
              totalPublishedEpisodes: 0,
              lastChangeTimeMs: 100,
              recentPremiereTimeMs: 100,
              createdTimeMs: 10,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              videoContainerCached: {},
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
                seasonTotalPublishedEpisodes: 1,
                seasonLastChangeTimeMs: 1000,
                seasonRecentPremiereTimeMs: 1000,
                seasonCreatedTimeMs: 10,
                seasonPublishedTimeMs: 1000,
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
                episodeVideoContainerCached: {},
                episodeState: EpisodeState.PUBLISHED,
                episodePremiereTimeMs: 1000,
              },
              GET_EPISODE_ROW,
            ),
          ]),
          "episode",
        );
        assertThat(
          await listPendingSeasonRecentPremiereTimeUpdatingTasks(
            SPANNER_DATABASE,
            {
              seasonRecentPremiereTimeUpdatingTaskExecutionTimeMsLe: 1000000,
            },
          ),
          isArray([]),
          "task",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
            deleteSeasonRecentPremiereTimeUpdatingTasksOfSeasonStatement({
              seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: "season1",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "PublishWithFuturePremiereTimeAndSeasonAlreadyPublishedAndRecentPremiereTimeUpdatingTask",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              totalPublishedEpisodes: 1,
              lastChangeTimeMs: 100,
              recentPremiereTimeMs: 100,
              createdTimeMs: 10,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              videoContainerCached: {},
              state: EpisodeState.DRAFT,
            }),
            insertSeasonRecentPremiereTimeUpdatingTaskStatement({
              seasonId: "season1",
              episodeId: "episode1",
              premiereTimeMs: 3000,
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
            premiereTimeMs: 2000,
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
                seasonTotalPublishedEpisodes: 2,
                seasonLastChangeTimeMs: 1000,
                seasonRecentPremiereTimeMs: 100,
                seasonCreatedTimeMs: 10,
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
                episodeIndex: 2,
                episodeVideoContainerCached: {},
                episodeState: EpisodeState.PUBLISHED,
                episodePremiereTimeMs: 2000,
              },
              GET_EPISODE_ROW,
            ),
          ]),
          "episode",
        );
        assertThat(
          await getSeasonRecentPremiereTimeUpdatingTaskMetadata(
            SPANNER_DATABASE,
            {
              seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: "season1",
              seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: "episode1",
              seasonRecentPremiereTimeUpdatingTaskPremiereTimeMsEq: 2000,
            },
          ),
          isArray([
            eqMessage(
              {
                seasonRecentPremiereTimeUpdatingTaskRetryCount: 0,
                seasonRecentPremiereTimeUpdatingTaskExecutionTimeMs: 2000,
              },
              GET_SEASON_RECENT_PREMIERE_TIME_UPDATING_TASK_ROW,
            ),
          ]),
          "task",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
            deleteSeasonRecentPremiereTimeUpdatingTasksOfSeasonStatement({
              seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: "season1",
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
              totalPublishedEpisodes: 0,
              lastChangeTimeMs: 100,
              recentPremiereTimeMs: 100,
              createdTimeMs: 10,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
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
      name: "AlreadyReachedMaxPublishedEpisodes",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              totalPublishedEpisodes: 1000,
              lastChangeTimeMs: 100,
              recentPremiereTimeMs: 100,
              createdTimeMs: 10,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              videoContainerCached: {},
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
              "Season season1 has reached maximum number of published episodes.",
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
              totalPublishedEpisodes: 0,
              lastChangeTimeMs: 100,
              recentPremiereTimeMs: 100,
              createdTimeMs: 10,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              videoContainerCached: {},
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
