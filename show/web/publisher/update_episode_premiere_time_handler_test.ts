import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  GET_EPISODE_ROW,
  GET_SEASON_RECENT_PREMIERE_TIME_UPDATING_TASK_METADATA_ROW,
  GET_SEASON_ROW,
  getEpisode,
  getSeason,
  getSeasonRecentPremiereTimeUpdatingTaskMetadata,
  insertEpisodeStatement,
  insertSeasonStatement,
  listPendingSeasonRecentPremiereTimeUpdatingTasks,
} from "../../../db/sql";
import { UpdateEpisodePremiereTimeHandler } from "./update_episode_premiere_time_handler";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { newBadRequestError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "UpdateEpisodePremiereTimeHandlerTest",
  cases: [
    {
      name: "UpdateWithPremiereTimeInThePast",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              createdTimeMs: 10,
              recentPremiereTimeMs: 300,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              state: EpisodeState.PUBLISHED,
              premiereTimeMs: 300,
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
        let handler = new UpdateEpisodePremiereTimeHandler(
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
            premiereTimeMs: 400,
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
                seasonCreatedTimeMs: 10,
                seasonLastChangeTimeMs: 1000,
                seasonRecentPremiereTimeMs: 400,
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
                episodeState: EpisodeState.PUBLISHED,
                episodePremiereTimeMs: 400,
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
          "tasks",
        );
      },
      async tearDown() {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({
              seasonSeasonIdEq: "season1",
            }),
          ]);
          await transaction.commit();
        });
      }
    },
    {
      name: "UpdateWithPremiereTimeInTheFuture",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              createdTimeMs: 10,
              recentPremiereTimeMs: 300,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              state: EpisodeState.PUBLISHED,
              premiereTimeMs: 300,
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
        let handler = new UpdateEpisodePremiereTimeHandler(
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
                seasonCreatedTimeMs: 10,
                seasonLastChangeTimeMs: 1000,
                seasonRecentPremiereTimeMs: 300,
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
              GET_SEASON_RECENT_PREMIERE_TIME_UPDATING_TASK_METADATA_ROW,
            ),
          ]),
          "tasks",
        );
      },
      async tearDown() {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({
              seasonSeasonIdEq: "season1",
            }),
          ]);
          await transaction.commit();
        });
      }
    },
    {
      name: "EpisodeNotPublished",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              createdTimeMs: 10,
              recentPremiereTimeMs: 300,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              state: EpisodeState.DRAFT,
              premiereTimeMs: 300,
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
        let handler = new UpdateEpisodePremiereTimeHandler(
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
              premiereTimeMs: 400,
            },
            "sessionStr",
          ),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newBadRequestError(
              "Season season1 episode episode1 is not in published state.",
            ),
          ),
          "error",
        );
      },
      async tearDown() {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({
              seasonSeasonIdEq: "season1",
            }),
          ]);
          await transaction.commit();
        });
      }
    },
  ],
});
