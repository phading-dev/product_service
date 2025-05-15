import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_COVER_IMAGE_DELETING_TASK_ROW,
  GET_LAST_SEASON_GRADES_ROW,
  GET_SEASON_ROW,
  GET_VIDEO_CONTAINER_DELETING_TASK_ROW,
  deleteCoverImageDeletingTaskStatement,
  deleteSeasonRecentPremiereTimeUpdatingTasksOfSeasonStatement,
  deleteSeasonStatement,
  deleteVideoContainerCreatingTaskStatement,
  deleteVideoContainerDeletingTaskStatement,
  getCoverImageDeletingTask,
  getLastSeasonGrades,
  getSeason,
  getVideoContainerDeletingTask,
  insertEpisodeStatement,
  insertSeasonGradeStatement,
  insertSeasonRecentPremiereTimeUpdatingTaskStatement,
  insertSeasonStatement,
  insertVideoContainerCreatingTaskStatement,
  listAllVideoContainersForPublisher,
  listPendingSeasonRecentPremiereTimeUpdatingTasks,
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
      deleteSeasonRecentPremiereTimeUpdatingTasksOfSeasonStatement({
        seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: "season1",
      }),
    ]);
    await transaction.commit();
  });
}

TEST_RUNNER.run({
  name: "ArchiveSeasonHandlerTest",
  cases: [
    {
      name: "SeasonWithEpisodesWithAndWithoutVideoContainerAndWithOneGrade",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              coverImageR2Filename: "cover1",
              createdTimeMs: 1000,
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
            insertSeasonRecentPremiereTimeUpdatingTaskStatement({
              seasonId: "season1",
              episodeId: "episode2",
              premiereTimeMs: 1000,
              retryCount: 0,
              executionTimeMs: 1000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "1900-01-01",
              endDate: "9999-12-31",
              grade: 3,
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
          () => new Date("2023-01-01T08:00:00Z"),
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
                seasonLastChangeTimeMs: new Date(
                  "2023-01-01T08:00:00Z",
                ).getTime(),
                seasonCreatedTimeMs: 1000,
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
                coverImageDeletingTaskExecutionTimeMs: new Date(
                  "2023-01-01T08:00:00Z",
                ).getTime(),
                coverImageDeletingTaskCreatedTimeMs: new Date(
                  "2023-01-01T08:00:00Z",
                ).getTime(),
              },
              GET_COVER_IMAGE_DELETING_TASK_ROW,
            ),
          ]),
          "r2FileDeletingTasks",
        );
        assertThat(
          await listPendingSeasonRecentPremiereTimeUpdatingTasks(
            SPANNER_DATABASE,
            {
              seasonRecentPremiereTimeUpdatingTaskExecutionTimeMsLe: new Date(
                "2026-01-01T08:00:00Z",
              ).getTime(),
            },
          ),
          isArray([]),
          "seasonRecentPremiereTimeUpdatingTasks",
        );
        assertThat(
          await listAllVideoContainersForPublisher(SPANNER_DATABASE, {
            episodeSeasonIdEq: "season1",
            seasonPublisherIdEq: "publisher1",
          }),
          isArray([]),
          "episodes",
        );
        assertThat(
          await listPendingVideoContainerCreatingTasks(SPANNER_DATABASE, {
            videoContainerCreatingTaskExecutionTimeMsLe: new Date(
              "2026-01-01T08:00:00Z",
            ).getTime(),
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
                videoContainerDeletingTaskExecutionTimeMs: new Date(
                  "2023-01-01T08:00:00Z",
                ).getTime(),
                videoContainerDeletingTaskCreatedTimeMs: new Date(
                  "2023-01-01T08:00:00Z",
                ).getTime(),
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
                videoContainerDeletingTaskExecutionTimeMs: new Date(
                  "2023-01-01T08:00:00Z",
                ).getTime(),
                videoContainerDeletingTaskCreatedTimeMs: new Date(
                  "2023-01-01T08:00:00Z",
                ).getTime(),
              },
              GET_VIDEO_CONTAINER_DELETING_TASK_ROW,
            ),
          ]),
          "videoContainerDeletingTasks for videoContainer4",
        );
        assertThat(
          await getLastSeasonGrades(SPANNER_DATABASE, {
            seasonGradeSeasonIdEq: "season1",
            seasonGradeEndDateGt: "2023-01-01",
            limit: 2,
          }),
          isArray([
            eqMessage(
              {
                seasonGradeSeasonId: "season1",
                seasonGradeGradeId: "grade1",
                seasonGradeStartDate: "1900-01-01",
                seasonGradeEndDate: "9999-12-31",
                seasonGradeGrade: 3,
              },
              GET_LAST_SEASON_GRADES_ROW,
            ),
          ]),
          "SeasonGrades",
        );
      },
      tearDown: async () => {
        await cleanUpAll();
      },
    },
    {
      name: "SeasonWithMultipleGrades",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              coverImageR2Filename: "cover1",
              createdTimeMs: 1000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "1900-01-01",
              endDate: "2010-01-01",
              grade: 1,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade2",
              startDate: "2010-01-01",
              endDate: "2023-02-01",
              grade: 3,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade3",
              startDate: "2023-02-01",
              endDate: "9999-12-31",
              grade: 5,
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
          () => new Date("2023-01-01T08:00:00Z"),
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
                seasonLastChangeTimeMs: new Date(
                  "2023-01-01T08:00:00Z",
                ).getTime(),
                seasonCreatedTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "season",
        );
        assertThat(
          await getLastSeasonGrades(SPANNER_DATABASE, {
            seasonGradeSeasonIdEq: "season1",
            seasonGradeEndDateGt: "2023-01-01",
            limit: 2,
          }),
          isArray([
            eqMessage(
              {
                seasonGradeSeasonId: "season1",
                seasonGradeGradeId: "grade2",
                seasonGradeStartDate: "2010-01-01",
                seasonGradeEndDate: "9999-12-31",
                seasonGradeGrade: 3,
              },
              GET_LAST_SEASON_GRADES_ROW,
            ),
          ]),
          "SeasonGrades",
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
              recentPremiereTimeMs: 100,
              coverImageR2Filename: "cover1",
              createdTimeMs: 1000,
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
          () => new Date("2023-01-01T08:00:00Z"),
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
          () => new Date("2023-01-01T08:00:00Z"),
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
