import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_EPISODE_ROW,
  GET_SEASON_ROW,
  LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
  deleteSeasonStatement,
  getEpisode,
  getSeason,
  insertEpisodeStatement,
  insertSeasonRecentPremiereTimeUpdatingTaskStatement,
  insertSeasonStatement,
  listNextPublishedEpisodesForPublisher,
  listPendingSeasonRecentPremiereTimeUpdatingTasks,
} from "../../../db/sql";
import { UnpublishEpisodeHandler } from "./unpublish_episode_handler";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { newBadRequestError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "UnpublishEpisodeHandlerTest",
  cases: [
    {
      name: "UnpublishTheLatestPublishedEpisode",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              totalPublishedEpisodes: 2,
              recentPremiereTimeMs: 300,
              createdTimeMs: 1000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              state: EpisodeState.PUBLISHED,
              index: 1,
              premiereTimeMs: 100,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              state: EpisodeState.PUBLISHED,
              index: 2,
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
                seasonTotalPublishedEpisodes: 1,
                seasonRecentPremiereTimeMs: 100,
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
            episodeEpisodeIdEq: "episode2",
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode2",
                episodeState: EpisodeState.DRAFT,
              },
              GET_EPISODE_ROW,
            ),
          ]),
          "episode",
        );
        assertThat(
          await listNextPublishedEpisodesForPublisher(SPANNER_DATABASE, {
            episodeSeasonIdEq: "season1",
            seasonPublisherIdEq: "publisher1",
            episodeStateEq: EpisodeState.PUBLISHED,
            episodeIndexGt: 0,
            limit: 10,
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode1",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 1,
                episodePremiereTimeMs: 100,
              },
              GET_EPISODE_ROW,
            ),
          ]),
          "all published episodes",
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
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "UnpublishTheFirstEpisodeWithRecentPremiereTimeUpdatingTask",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              totalPublishedEpisodes: 3,
              createdTimeMs: 1000,
              recentPremiereTimeMs: 300,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              state: EpisodeState.PUBLISHED,
              index: 1,
              premiereTimeMs: 100,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              state: EpisodeState.PUBLISHED,
              index: 2,
              premiereTimeMs: 300,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              state: EpisodeState.PUBLISHED,
              index: 3,
              premiereTimeMs: 2000,
            }),
            insertSeasonRecentPremiereTimeUpdatingTaskStatement({
              seasonId: "season1",
              episodeId: "episode1",
              premiereTimeMs: 1000,
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
                seasonTotalPublishedEpisodes: 2,
                seasonRecentPremiereTimeMs: 300,
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
                episodeState: EpisodeState.DRAFT,
              },
              GET_EPISODE_ROW,
            ),
          ]),
          "episode",
        );
        assertThat(
          await listNextPublishedEpisodesForPublisher(SPANNER_DATABASE, {
            episodeSeasonIdEq: "season1",
            seasonPublisherIdEq: "publisher1",
            episodeStateEq: EpisodeState.PUBLISHED,
            episodeIndexGt: 0,
            limit: 10,
          }),
          isArray([
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode2",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 1,
                episodePremiereTimeMs: 300,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
            ),
            eqMessage(
              {
                episodeSeasonId: "season1",
                episodeEpisodeId: "episode3",
                episodeState: EpisodeState.PUBLISHED,
                episodeIndex: 2,
                episodePremiereTimeMs: 2000,
              },
              LIST_NEXT_PUBLISHED_EPISODES_FOR_PUBLISHER_ROW,
            ),
          ]),
          "all published episodes",
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
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "UnpublishTheLastPublishedEpisode",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              totalPublishedEpisodes: 1,
              createdTimeMs: 1000,
              recentPremiereTimeMs: 300,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              state: EpisodeState.PUBLISHED,
              index: 1,
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
              `Season season1 episode episode1 is the last published episode.`,
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
