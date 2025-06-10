import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertEpisodeStatement,
  insertSeasonGradeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { ListContinueWatchingSeasonsHandler } from "./list_continue_watching_seasons_handler";
import {
  LIST_RECENTLY_WATCHED_SEASONS,
  LIST_RECENTLY_WATCHED_SEASONS_REQUEST_BODY,
  ListRecentlyWatchedSeasonsResponse,
} from "@phading/play_activity_service_interface/show/node/interface";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { LIST_CONTINUE_WATCHING_SEASONS_RESPONSE } from "@phading/product_service_interface/show/web/consumer/interface";
import {
  FETCH_SESSION_AND_CHECK_CAPABILITY,
  FetchSessionAndCheckCapabilityResponse,
} from "@phading/user_session_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeClientOptions } from "@selfage/node_service_client";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { ClientRequestInterface } from "@selfage/service_descriptor/client_request_interface";
import { assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "ListContinueWatchingSeasonsHandlerTest",
  cases: [
    {
      name: "ListThatOneSeasonAndContinueWithLatestEpisode_OneWithoutRatingAndContinueWithNextEpisode_OneWithLatestEpisodeNotFound_OneWithNextEpisodeNotFound_OneWithSeasonNotFound",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              name: "name1",
              coverImageR2Filename: "cover1",
              totalPublishedEpisodes: 25,
              ratingsCount: 2,
              averageRating: 4.5,
              createdTimeMs: 1000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 11,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              name: "S1E1",
              videoContainerCached: {
                durationSec: 60,
              },
              state: EpisodeState.PUBLISHED,
              premiereTimeMs: 1000,
            }),
            insertSeasonStatement({
              seasonId: "season2",
              publisherId: "publisher2",
              state: SeasonState.PUBLISHED,
              name: "name2",
              ratingsCount: 0,
              averageRating: 0,
              createdTimeMs: 1000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season2",
              gradeId: "grade2",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 22,
            }),
            insertEpisodeStatement({
              seasonId: "season2",
              episodeId: "episode1",
              index: 1,
              name: "S2E1",
              videoContainerCached: {
                durationSec: 120,
              },
              state: EpisodeState.PUBLISHED,
              premiereTimeMs: 2000,
            }),
            insertEpisodeStatement({
              seasonId: "season2",
              episodeId: "episode2",
              index: 2,
              name: "S2E2",
              videoContainerCached: {
                durationSec: 180,
              },
              state: EpisodeState.PUBLISHED,
              premiereTimeMs: 2000,
            }),
            insertSeasonStatement({
              seasonId: "season3",
              publisherId: "publisher3",
              state: SeasonState.PUBLISHED,
              name: "name3",
              coverImageR2Filename: "cover3",
              ratingsCount: 0,
              averageRating: 0,
              createdTimeMs: 1000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season3",
              gradeId: "grade3",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 33,
            }),
            insertSeasonStatement({
              seasonId: "season4",
              publisherId: "publisher4",
              state: SeasonState.PUBLISHED,
              name: "name4",
              coverImageR2Filename: "cover4",
              ratingsCount: 0,
              averageRating: 0,
              createdTimeMs: 1000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season4",
              gradeId: "grade4",
              startDate: "1970-01-01",
              endDate: "9999-12-31",
              grade: 44,
            }),
            insertEpisodeStatement({
              seasonId: "season4",
              episodeId: "episode1",
              index: 1,
              name: "S4E1",
              videoContainerCached: {
                durationSec: 240,
              },
              state: EpisodeState.PUBLISHED,
              premiereTimeMs: 4000,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new (class extends NodeServiceClientMock {
          public async send(
            request: ClientRequestInterface<any>,
            options?: NodeClientOptions,
          ): Promise<any> {
            switch (request.descriptor) {
              case FETCH_SESSION_AND_CHECK_CAPABILITY:
                return {
                  accountId: "account1",
                  capabilities: {
                    canConsume: true,
                  },
                } as FetchSessionAndCheckCapabilityResponse;
              case LIST_RECENTLY_WATCHED_SEASONS:
                this.request = request;
                return {
                  seasons: [
                    {
                      seasonId: "season1",
                      latestEpisodeId: "episode1",
                      latestWatchedVideoTimeMs: 30000,
                    },
                    {
                      seasonId: "season2",
                      latestEpisodeId: "episode1",
                      latestWatchedVideoTimeMs: 110000,
                    },
                    {
                      seasonId: "season3",
                      latestEpisodeId: "episode1",
                      latestWatchedVideoTimeMs: 30000,
                    },
                    {
                      seasonId: "season4",
                      latestEpisodeId: "episode1",
                      latestWatchedVideoTimeMs: 230000,
                    },
                    {
                      seasonId: "season5",
                      latestEpisodeId: "episode1",
                      latestWatchedVideoTimeMs: 30000,
                    },
                  ],
                } as ListRecentlyWatchedSeasonsResponse;
            }
          }
        })();
        let handler = new ListContinueWatchingSeasonsHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          "https://test.com",
          () => new Date(1000),
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            limit: 10,
          },
          "authStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              continues: [
                {
                  season: {
                    seasonId: "season1",
                    publisherId: "publisher1",
                    name: "name1",
                    coverImageUrl: "https://test.com/cover1",
                    grade: 11,
                    totalEpisodes: 25,
                    ratingsCount: 2,
                    averageRating: 4.5,
                  },
                  episode: {
                    episodeId: "episode1",
                    index: 1,
                    name: "S1E1",
                    videoDurationSec: 60,
                    premiereTimeMs: 1000,
                  },
                  continueTimeMs: 30000,
                },
                {
                  season: {
                    seasonId: "season2",
                    publisherId: "publisher2",
                    name: "name2",
                    grade: 22,
                    ratingsCount: 0,
                    averageRating: 0,
                  },
                  episode: {
                    episodeId: "episode2",
                    index: 2,
                    name: "S2E2",
                    videoDurationSec: 180,
                    premiereTimeMs: 2000,
                  },
                  continueTimeMs: 0,
                },
              ],
            },
            LIST_CONTINUE_WATCHING_SEASONS_RESPONSE,
          ),
          "response",
        );
        assertThat(
          serviceClientMock.request.body,
          eqMessage(
            {
              watcherId: "account1",
              limit: 10,
            },
            LIST_RECENTLY_WATCHED_SEASONS_REQUEST_BODY,
          ),
          "listRecentlyWatchedSeasons request",
        );
      },
      async tearDown() {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({
              seasonSeasonIdEq: "season1",
            }),
            deleteSeasonStatement({
              seasonSeasonIdEq: "season2",
            }),
            deleteSeasonStatement({
              seasonSeasonIdEq: "season3",
            }),
            deleteSeasonStatement({
              seasonSeasonIdEq: "season4",
            }),
            deleteSeasonStatement({
              seasonSeasonIdEq: "season5",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
