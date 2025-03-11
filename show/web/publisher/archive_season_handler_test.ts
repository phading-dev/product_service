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
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { newBadRequestError, newNotFoundError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

async function cleanUpAll() {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    await transaction.batchUpdate([
      deleteSeasonStatement("season1"),
      deleteCoverImageDeletingTaskStatement("cover1"),
      deleteVideoContainerCreatingTaskStatement("season1", "episode1"),
      deleteVideoContainerCreatingTaskStatement("season1", "episode2"),
      deleteVideoContainerCreatingTaskStatement("season1", "episode3"),
      deleteVideoContainerCreatingTaskStatement("season1", "episode4"),
      deleteVideoContainerDeletingTaskStatement("videoContainer1"),
      deleteVideoContainerDeletingTaskStatement("videoContainer2"),
      deleteVideoContainerDeletingTaskStatement("videoContainer3"),
      deleteVideoContainerDeletingTaskStatement("videoContainer4"),
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
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
              coverImageR2Filename: "cover1",
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              name: "Ep 1",
              index: 1,
              publishTimeMs: 200,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              name: "Ep 2",
              index: 2,
              videoContainerId: "videoContainer2",
              publishTimeMs: 300,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              name: "Ep 3",
              index: 3,
              publishTimeMs: 400,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode4",
              name: "Ep 4",
              index: 4,
              videoContainerId: "videoContainer4",
              publishTimeMs: 500,
            }),
            insertVideoContainerCreatingTaskStatement(
              "season1",
              "episode1",
              0,
              0,
              0,
            ),
            insertVideoContainerCreatingTaskStatement(
              "season1",
              "episode3",
              0,
              0,
              0,
            ),
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
        let handler = new ArchiveSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle("", { seasonId: "season1" }, "sessionStr");

        // Verify
        assertThat(
          await getSeason(SPANNER_DATABASE, "season1"),
          isArray([
            eqMessage(
              {
                seasonData: {
                  seasonId: "season1",
                  publisherId: "publisher1",
                  state: SeasonState.ARCHIVED,
                  lastChangeTimeMs: 1000,
                  recentPremierTimeMs: 100,
                },
              },
              GET_SEASON_ROW,
            ),
          ]),
          "season",
        );
        assertThat(
          await getCoverImageDeletingTask(SPANNER_DATABASE, "cover1"),
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
          await listNextEpisodesForPublisher(
            SPANNER_DATABASE,
            "publisher1",
            "season1",
            0,
            10,
          ),
          isArray([]),
          "episodes",
        );
        assertThat(
          await listPendingVideoContainerCreatingTasks(
            SPANNER_DATABASE,
            1000000,
          ),
          isArray([]),
          "videoContainerCreatingTasks",
        );
        assertThat(
          await getVideoContainerDeletingTask(
            SPANNER_DATABASE,
            "videoContainer2",
          ),
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
          await getVideoContainerDeletingTask(
            SPANNER_DATABASE,
            "videoContainer4",
          ),
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
            canPublishShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
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
            canPublishShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
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
