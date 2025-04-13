import "../../../local/env";
import { FAR_FUTURE_TIME_MS } from "../../../common/constants";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_EPISODE_ROW,
  GET_SEASON_ROW,
  deleteSeasonRecentPremiereTimeUpdatingTaskStatement,
  deleteSeasonStatement,
  getEpisode,
  getSeason,
  insertEpisodeStatement,
  insertSeasonRecentPremiereTimeUpdatingTaskStatement,
  insertSeasonStatement,
  listPendingSeasonRecentPremiereTimeUpdatingTasks,
} from "../../../db/sql";
import { UnpublishEpisodeHandler } from "./unpublish_episode_handler";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "UnpublishEpisodeHandlerTest",
  cases: [
    {
      name: "UnpublishWithNoPremiereedEpisode",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              createdTimeMs: 1000,
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
        let handler = new UnpublishEpisodeHandler(
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
                seasonLastChangeTimeMs: 1000,
                seasonRecentPremiereTimeMs: FAR_FUTURE_TIME_MS,
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
                episodeState: EpisodeState.DRAFT,
                episodePremiereTimeMs: FAR_FUTURE_TIME_MS,
              },
              GET_EPISODE_ROW,
            ),
          ]),
          "episode",
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
      name: "UnpublishWithPremiereedEpisodesAndRecentPremiereTimeUpdatingTask",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              createdTimeMs: 1000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              state: EpisodeState.PUBLISHED,
              premiereTimeMs: 300,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              state: EpisodeState.PUBLISHED,
              premiereTimeMs: 100,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              state: EpisodeState.PUBLISHED,
              premiereTimeMs: 2000,
            }),
            insertSeasonRecentPremiereTimeUpdatingTaskStatement({
              seasonId: "season1",
              episodeId: "episode1",
              retryCount: 0,
              executionTimeMs: 1000,
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
        let handler = new UnpublishEpisodeHandler(
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
                seasonLastChangeTimeMs: 1000,
                seasonRecentPremiereTimeMs: 100,
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
                episodeState: EpisodeState.DRAFT,
                episodePremiereTimeMs: FAR_FUTURE_TIME_MS,
              },
              GET_EPISODE_ROW,
            ),
          ]),
          "episode",
        );
        assertThat(
          await listPendingSeasonRecentPremiereTimeUpdatingTasks(
            SPANNER_DATABASE,
            { seasonRecentPremiereTimeUpdatingTaskExecutionTimeMsLe: 1000000 },
          ),
          isArray([]),
          "pending tasks",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({ seasonSeasonIdEq: "season1" }),
            deleteSeasonRecentPremiereTimeUpdatingTaskStatement({
              seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: "season1",
              seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: "episode1",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
