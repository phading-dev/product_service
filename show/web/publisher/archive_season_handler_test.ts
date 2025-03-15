import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_COVER_IMAGE_DELETING_TASK_ROW,
  GET_SEASON_ROW,
  GET_VIDEO_CONTAINER_DELETING_TASK_ROW,
  deleteCoverImageDeletingTaskStatement,
  deleteSeasonStatement,
  deleteVideoContainerCreatingTaskStatement,
  deleteVideoContainerDeletingTaskStatement,
  getCoverImageDeletingTask,
  getSeason,
  getVideoContainerDeletingTask,
  insertEpisodeStatement,
  insertSeasonStatement,
  insertVideoContainerCreatingTaskStatement,
  listNextEpisodesForPublisher,
  listPendingVideoContainerCreatingTasks,
} from "../../../db/sql";
import { ArchiveSeasonHandler } from "./archive_season_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { newBadRequestError, newNotFoundError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

async function cleanUpAll() {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    await transaction.batchUpdate([
      deleteSeasonStatement({
        seasonSeasonIdEq: "season1",
      }),
      deleteCoverImageDeletingTaskStatement({
        coverImageDeletingTaskR2FilenameEq: "cover1",
      }),
      deleteVideoContainerCreatingTaskStatement({
        videoContainerCreatingTaskSeasonIdEq: "season1",
        videoContainerCreatingTaskEpisodeIdEq: "episode1",
      }),
      deleteVideoContainerCreatingTaskStatement({
        videoContainerCreatingTaskSeasonIdEq: "season1",
        videoContainerCreatingTaskEpisodeIdEq: "episode2",
      }),
      deleteVideoContainerCreatingTaskStatement({
        videoContainerCreatingTaskSeasonIdEq: "season1",
        videoContainerCreatingTaskEpisodeIdEq: "episode3",
      }),
      deleteVideoContainerCreatingTaskStatement({
        videoContainerCreatingTaskSeasonIdEq: "season1",
        videoContainerCreatingTaskEpisodeIdEq: "episode4",
      }),
      deleteVideoContainerDeletingTaskStatement({
        videoContainerDeletingTaskVideoContainerIdEq: "videoContainer1",
      }),
      deleteVideoContainerDeletingTaskStatement({
        videoContainerDeletingTaskVideoContainerIdEq: "videoContainer2",
      }),
      deleteVideoContainerDeletingTaskStatement({
        videoContainerDeletingTaskVideoContainerIdEq: "videoContainer3",
      }),
      deleteVideoContainerDeletingTaskStatement({
        videoContainerDeletingTaskVideoContainerIdEq: "videoContainer4",
      }),
    ]);
    await transaction.commit();
  });
}

TEST_RUNNER.run({
  name: "ArchiveSeasonHandlerTest",
  cases: [
    {
      name: "SeasonWithEpisodesAndWithoutVideoContainer",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              coverImageR2Filename: "cover1",
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              name: "Ep 1",
              index: 1,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              name: "Ep 2",
              index: 2,
              videoContainerId: "videoContainer2",
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              name: "Ep 3",
              index: 3,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode4",
              name: "Ep 4",
              index: 4,
              videoContainerId: "videoContainer4",
            }),
            insertVideoContainerCreatingTaskStatement({
              seasonId: "season1",
              episodeId: "episode1",
            }),
            insertVideoContainerCreatingTaskStatement({
              seasonId: "season1",
              episodeId: "episode3",
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
        let handler = new ArchiveSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle("", { seasonId: "season1" }, "sessionStr");

        // Verify
        assertThat(
          await getSeason(SPANNER_DATABASE, {
            seasonSeasonIdEq: "season1",
          }),
          isArray([
            eqMessage(
              {
                seasonSeasonId: "season1",
                seasonPublisherId: "publisher1",
                seasonState: SeasonState.ARCHIVED,
                seasonLastChangeTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "season",
        );
        assertThat(
          await getCoverImageDeletingTask(SPANNER_DATABASE, {
            coverImageDeletingTaskR2FilenameEq: "cover1",
          }),
          isArray([
            eqMessage(
              {
                coverImageDeletingTaskR2Filename: "cover1",
                coverImageDeletingTaskRetryCount: 0,
                coverImageDeletingTaskExecutionTimeMs: 1000,
                coverImageDeletingTaskCreatedTimeMs: 1000,
              },
              GET_COVER_IMAGE_DELETING_TASK_ROW,
            ),
          ]),
          "r2FileDeletingTasks",
        );
        assertThat(
          await listNextEpisodesForPublisher(SPANNER_DATABASE, {
            sPublisherIdEq: "publisher1",
            eSeasonIdEq: "season1",
            eIndexGt: 0,
            limit: 10,
          }),
          isArray([]),
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
          await getVideoContainerDeletingTask(SPANNER_DATABASE, {
            videoContainerDeletingTaskVideoContainerIdEq: "videoContainer2",
          }),
          isArray([
            eqMessage(
              {
                videoContainerDeletingTaskVideoContainerId: "videoContainer2",
                videoContainerDeletingTaskRetryCount: 0,
                videoContainerDeletingTaskExecutionTimeMs: 1000,
                videoContainerDeletingTaskCreatedTimeMs: 1000,
              },
              GET_VIDEO_CONTAINER_DELETING_TASK_ROW,
            ),
          ]),
          "videoContainerDeletingTasks for videoContainer2",
        );
        assertThat(
          await getVideoContainerDeletingTask(SPANNER_DATABASE, {
            videoContainerDeletingTaskVideoContainerIdEq: "videoContainer4",
          }),
          isArray([
            eqMessage(
              {
                videoContainerDeletingTaskVideoContainerId: "videoContainer4",
                videoContainerDeletingTaskRetryCount: 0,
                videoContainerDeletingTaskExecutionTimeMs: 1000,
                videoContainerDeletingTaskCreatedTimeMs: 1000,
              },
              GET_VIDEO_CONTAINER_DELETING_TASK_ROW,
            ),
          ]),
          "videoContainerDeletingTasks for videoContainer4",
        );
      },
      tearDown: async () => {
        await cleanUpAll();
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
              publisherId: "publisher1",
              state: SeasonState.DRAFT,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
              coverImageR2Filename: "cover1",
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
        let handler = new ArchiveSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        let error = await assertReject(
          handler.handle("", { seasonId: "season1" }, "sessionStr"),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newBadRequestError(
              "Season season1 is not in PUBLISHED state and cannot be archived.",
            ),
          ),
          "error",
        );
      },
      tearDown: async () => {
        await cleanUpAll();
      },
    },
    {
      name: "SeasonNotFound",
      execute: async () => {
        // Prepare
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublish: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new ArchiveSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        let error = await assertReject(
          handler.handle("", { seasonId: "season1" }, "sessionStr"),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(newNotFoundError(`Season season1 is not found.`)),
          "error",
        );
      },
      tearDown: async () => {
        await cleanUpAll();
      },
    },
  ],
});
