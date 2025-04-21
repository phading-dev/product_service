import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_EPISODE_ROW,
  GET_SEASON_ROW,
  GET_VIDEO_CONTAINER_CREATING_TASK_ROW,
  deleteSeasonStatement,
  deleteVideoContainerCreatingTaskStatement,
  getEpisode,
  getSeason,
  getVideoContainerCreatingTask,
  insertSeasonStatement,
} from "../../../db/sql";
import { CreateEpisodeHandler } from "./create_episode_handler";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { CREATE_EPISODE_RESPONSE } from "@phading/product_service_interface/show/web/publisher/interface";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
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
                name: "Ep 1",
                state: EpisodeState.DRAFT,
              },
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
            episodeEpisodeIdEq: "episode1",
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode1",
                episodeName: "Ep 1",
                episodeState: EpisodeState.DRAFT,
              },
              GET_EPISODE_ROW,
            ),
          ]),
          "episode",
        );
        assertThat(
          await getVideoContainerCreatingTask(SPANNER_DATABASE, {
            videoContainerCreatingTaskSeasonIdEq: "season1",
            videoContainerCreatingTaskEpisodeIdEq: "episode1",
          }),
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
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
            deleteVideoContainerCreatingTaskStatement({
              videoContainerCreatingTaskSeasonIdEq: "season1",
              videoContainerCreatingTaskEpisodeIdEq: "episode1",
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
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublish: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
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
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
            deleteVideoContainerCreatingTaskStatement({
              videoContainerCreatingTaskSeasonIdEq: "season1",
              videoContainerCreatingTaskEpisodeIdEq: "episode1",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
