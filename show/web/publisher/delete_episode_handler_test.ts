import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_SEASON_ROW,
  GET_VIDEO_CONTAINER_DELETING_TASK_ROW,
  LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
  deleteSeasonStatement,
  deleteVideoContainerDeletingTaskStatement,
  getSeason,
  getVideoContainerDeletingTask,
  insertEpisodeStatement,
  insertSeasonStatement,
  insertVideoContainerCreatingTaskStatement,
  listNextEpisodesForPublisher,
  listPendingVideoContainerCreatingTasks,
  listPendingVideoContainerDeletingTasks,
} from "../../../db/sql";
import { DeleteEpisodeHandler } from "./delete_episode_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { newNotFoundError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "DeleteEpisodeHandlerTest",
  cases: [
    {
      name: "DeleteEpisodeWithVideoContainer",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              totalEpisodes: 4,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              name: "Ep 1",
              videoContainerId: "videocontainer1",
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              index: 2,
              name: "Ep 2",
              videoContainerId: "videocontainer2",
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              index: 3,
              name: "Ep 3",
              videoContainerId: "videocontainer3",
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode4",
              index: 4,
              name: "Ep 4",
              videoContainerId: "videocontainer4",
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
        let handler = new DeleteEpisodeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "episode2",
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
                seasonTotalEpisodes: 3,
                seasonLastChangeTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "season",
        );
        assertThat(
          await listNextEpisodesForPublisher(SPANNER_DATABASE, {
            seasonPublisherIdEq: "publisher1",
            episodeSeasonIdEq: "season1",
            episodeIndexGt: 0,
            limit: 10,
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode1",
                episodeIndex: 1,
                episodeName: "Ep 1",
                episodeVideoContainerId: "videocontainer1",
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode3",
                episodeIndex: 2,
                episodeName: "Ep 3",
                episodeVideoContainerId: "videocontainer3",
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode4",
                episodeIndex: 3,
                episodeName: "Ep 4",
                episodeVideoContainerId: "videocontainer4",
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
          ]),
          "episodes",
        );
        assertThat(
          await getVideoContainerDeletingTask(SPANNER_DATABASE, {
            videoContainerDeletingTaskVideoContainerIdEq: "videocontainer2",
          }),
          isArray([
            eqMessage(
              {
                videoContainerDeletingTaskVideoContainerId: "videocontainer2",
                videoContainerDeletingTaskRetryCount: 0,
                videoContainerDeletingTaskExecutionTimeMs: 1000,
                videoContainerDeletingTaskCreatedTimeMs: 1000,
              },
              GET_VIDEO_CONTAINER_DELETING_TASK_ROW,
            ),
          ]),
          "videoContainerDeletingTasks",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
            deleteVideoContainerDeletingTaskStatement({
              videoContainerDeletingTaskVideoContainerIdEq: "videocontainer1",
            }),
            deleteVideoContainerDeletingTaskStatement({
              videoContainerDeletingTaskVideoContainerIdEq: "videocontainer2",
            }),
            deleteVideoContainerDeletingTaskStatement({
              videoContainerDeletingTaskVideoContainerIdEq: "videocontainer3",
            }),
            deleteVideoContainerDeletingTaskStatement({
              videoContainerDeletingTaskVideoContainerIdEq: "videocontainer4",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "DeleteEpisodeWithoutVideoContainer",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              totalEpisodes: 2,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              name: "Ep 1",
              videoContainerId: "videocontainer1",
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              index: 2,
              name: "Ep 2",
            }),
            insertVideoContainerCreatingTaskStatement({
              seasonId: "season1",
              episodeId: "episode2",
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
        let handler = new DeleteEpisodeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "episode2",
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
                seasonTotalEpisodes: 1,
                seasonLastChangeTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "season",
        );
        assertThat(
          await listNextEpisodesForPublisher(SPANNER_DATABASE, {
            seasonPublisherIdEq: "publisher1",
            episodeSeasonIdEq: "season1",
            episodeIndexGt: 0,
            limit: 10,
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode1",
                episodeIndex: 1,
                episodeName: "Ep 1",
                episodeVideoContainerId: "videocontainer1",
              },
              LIST_NEXT_EPISODES_FOR_PUBLISHER_ROW,
            ),
          ]),
          "episodes",
        );
        assertThat(
          await listPendingVideoContainerCreatingTasks(SPANNER_DATABASE, {
            videoContainerCreatingTaskExecutionTimeMsLe: 1000000,
          }),
          isArray([]),
          "videoContainerCreatingTasks",
        );
        assertThat(
          await listPendingVideoContainerDeletingTasks(SPANNER_DATABASE, {
            videoContainerDeletingTaskExecutionTimeMsLe: 1000000,
          }),
          isArray([]),
          "videoContainerDeletingTasks",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
            deleteVideoContainerDeletingTaskStatement({
              videoContainerDeletingTaskVideoContainerIdEq: "videocontainer1",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "EpisodeNotFound",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
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
        let handler = new DeleteEpisodeHandler(
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
