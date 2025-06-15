import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_EPISODE_ROW,
  GET_SEASON_ROW,
  GET_VIDEO_CONTAINER_DELETING_TASK_ROW,
  deleteSeasonStatement,
  deleteVideoContainerDeletingTaskStatement,
  deleteVideoContainerKeyStatement,
  getEpisode,
  getSeason,
  getVideoContainerDeletingTask,
  getVideoContainerKey,
  insertSeasonStatement,
  listPendingVideoContainerDeletingTasks,
} from "../../../db/sql";
import { CreateEpisodeHandler } from "./create_episode_handler";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { CREATE_EPISODE_RESPONSE } from "@phading/product_service_interface/show/web/publisher/interface";
import {
  FETCH_SESSION_AND_CHECK_CAPABILITY,
  FetchSessionAndCheckCapabilityResponse,
} from "@phading/user_session_service_interface/node/interface";
import {
  CREATE_VIDEO_CONTAINER,
  CREATE_VIDEO_CONTAINER_REQUEST_BODY,
} from "@phading/video_service_interface/node/interface";
import { newBadRequestError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { ClientRequestInterface } from "@selfage/service_descriptor/client_request_interface";
import { assertReject, assertThat, eq, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

let TWO_YEAR_MS = 2 * 365 * 24 * 60 * 60 * 1000;
let ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

TEST_RUNNER.run({
  name: "CreateEpisodeHandlerTest",
  cases: [
    {
      name: "StalledCreating_ResumedAndSuccess",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.DRAFT,
              createdTimeMs: 1000,
            }),
          ]);
          await transaction.commit();
        });
        let stallResolveFn: () => void;
        let firstEncounterResolveFn: () => void;
        let firstEncounterPromise = new Promise<void>(
          (resolve) => (firstEncounterResolveFn = resolve),
        );
        let serviceClientMock = new (class extends NodeServiceClientMock {
          public async send(
            request: ClientRequestInterface<any>,
          ): Promise<any> {
            if (request.descriptor === FETCH_SESSION_AND_CHECK_CAPABILITY) {
              let response: FetchSessionAndCheckCapabilityResponse = {
                accountId: "publisher1",
                capabilities: {
                  canPublish: true,
                },
              };
              return response;
            } else {
              this.request = request;
              firstEncounterResolveFn();
              await new Promise<void>((resolve) => (stallResolveFn = resolve));
              return {};
            }
          }
        })();
        let id = 0;
        let handler = new CreateEpisodeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
          () => `uuid${id++}`,
        );

        // Execute
        let responsePromise = handler.handle(
          "",
          {
            seasonId: "season1",
            episodeName: "Ep 1",
          },
          "sessionStr",
        );
        await firstEncounterPromise;

        // Verify
        assertThat(
          serviceClientMock.request.descriptor,
          eq(CREATE_VIDEO_CONTAINER),
          "RC",
        );
        assertThat(
          serviceClientMock.request.body,
          eqMessage(
            {
              seasonId: "season1",
              episodeId: "uuid1",
              accountId: "publisher1",
              videoContainerId: "showuuid0",
            },
            CREATE_VIDEO_CONTAINER_REQUEST_BODY,
          ),
          "RC body",
        );
        assertThat(
          (
            await getVideoContainerKey(SPANNER_DATABASE, {
              videoContainerKeyKeyEq: "showuuid0",
            })
          ).length,
          eq(1),
          "videoContainerKey",
        );
        assertThat(
          await getVideoContainerDeletingTask(SPANNER_DATABASE, {
            videoContainerDeletingTaskVideoContainerIdEq: "showuuid0",
          }),
          isArray([
            eqMessage(
              {
                videoContainerDeletingTaskVideoContainerId: "showuuid0",
                videoContainerDeletingTaskRetryCount: 0,
                videoContainerDeletingTaskExecutionTimeMs: 1000 + ONE_YEAR_MS,
                videoContainerDeletingTaskCreatedTimeMs: 1000,
              },
              GET_VIDEO_CONTAINER_DELETING_TASK_ROW,
            ),
          ]),
          "deleting tasks",
        );

        // Execute
        stallResolveFn();
        let response = await responsePromise;

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              episodeId: "uuid1",
            },
            CREATE_EPISODE_RESPONSE,
          ),
          "response",
        );
        assertThat(
          await getSeason(SPANNER_DATABASE, {
            seasonSeasonIdEq: "season1",
          }),
          isArray([
            eqMessage(
              {
                seasonSeasonId: "season1",
                seasonPublisherId: "publisher1",
                seasonState: SeasonState.DRAFT,
                seasonLastChangeTimeMs: 1000,
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
            episodeEpisodeIdEq: "uuid1",
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "uuid1",
                episodeName: "Ep 1",
                episodeState: EpisodeState.DRAFT,
                episodeVideoContainerId: "showuuid0",
              },
              GET_EPISODE_ROW,
            ),
          ]),
          "episode",
        );
        assertThat(
          await listPendingVideoContainerDeletingTasks(SPANNER_DATABASE, {
            videoContainerDeletingTaskExecutionTimeMsLe: TWO_YEAR_MS,
          }),
          isArray([]),
          "deleting tasks 2",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
            deleteVideoContainerKeyStatement({
              videoContainerKeyKeyEq: "showuuid0",
            }),
            deleteVideoContainerDeletingTaskStatement({
              videoContainerDeletingTaskVideoContainerIdEq: "showuuid0",
            }),
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
              createdTimeMs: 1000,
            }),
          ]);
          await transaction.commit();
        });

        let serviceClientMock = new (class extends NodeServiceClientMock {
          public async send(
            request: ClientRequestInterface<any>,
          ): Promise<any> {
            if (request.descriptor === FETCH_SESSION_AND_CHECK_CAPABILITY) {
              let response: FetchSessionAndCheckCapabilityResponse = {
                accountId: "publisher1",
                capabilities: {
                  canPublish: true,
                },
              };
              return response;
            } else {
              return {};
            }
          }
        })();
        let id = 0;
        let handler = new CreateEpisodeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
          () => `uuid${id++}`,
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
        assertThat(
          (
            await getVideoContainerKey(SPANNER_DATABASE, {
              videoContainerKeyKeyEq: "showuuid0",
            })
          ).length,
          eq(1),
          "videoContainerKey",
        );
        assertThat(
          await getVideoContainerDeletingTask(SPANNER_DATABASE, {
            videoContainerDeletingTaskVideoContainerIdEq: "showuuid0",
          }),
          isArray([
            eqMessage(
              {
                videoContainerDeletingTaskVideoContainerId: "showuuid0",
                videoContainerDeletingTaskRetryCount: 0,
                videoContainerDeletingTaskExecutionTimeMs: 301000,
                videoContainerDeletingTaskCreatedTimeMs: 1000,
              },
              GET_VIDEO_CONTAINER_DELETING_TASK_ROW,
            ),
          ]),
          "deleting tasks",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
            deleteVideoContainerKeyStatement({
              videoContainerKeyKeyEq: "showuuid0",
            }),
            deleteVideoContainerDeletingTaskStatement({
              videoContainerDeletingTaskVideoContainerIdEq: "showuuid0",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
