import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertEpisodeStatement,
  insertSeasonGradeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { GetSeasonAndEpisodeSummaryHandler } from "./get_season_and_episode_summary_handler";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { GET_SEASON_AND_EPISODE_SUMMARY_RESPONSE } from "@phading/product_service_interface/show/web/consumer/interface";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { newNotFoundError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "GetSeasonAndEpisodeSummaryHandlerTest",
  cases: [
    {
      name: "GetSummary",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              name: "Season 1",
              coverImageR2Filename: "image1",
              totalEpisodes: 3,
              description: "",
              averageRating: 4.5,
              ratingsCount: 99,
              createdTimeMs: 1000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "2020-01-01",
              endDate: "2020-12-01",
              grade: 10,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              state: EpisodeState.PUBLISHED,
              index: 1,
              name: "Episode 1",
              premiereTimeMs: 24000,
              videoContainer: {
                durationSec: 3600,
              },
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
          capabilities: {
            canConsume: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new GetSeasonAndEpisodeSummaryHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          "https://public_access_domain",
          () => new Date(1580544000000), // 2020-02-01T08:00:00.000Z
        );

        // Execute
        let response = await handler.handle(
          "",
          { seasonId: "season1", episodeId: "episode1" },
          "sessionStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              summary: {
                season: {
                  seasonId: "season1",
                  publisherId: "publisher1",
                  name: "Season 1",
                  coverImageUrl: "https://public_access_domain/image1",
                  grade: 10,
                  totalEpisodes: 3,
                  averageRating: 4.5,
                  ratingsCount: 99,
                },
                episode: {
                  episodeId: "episode1",
                  index: 1,
                  name: "Episode 1",
                  premiereTimeMs: 24000,
                  videoDurationSec: 3600,
                },
              },
            },
            GET_SEASON_AND_EPISODE_SUMMARY_RESPONSE,
          ),
          "response",
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
      },
    },
    {
      name: "SeasonNotPublished",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.ARCHIVED,
              name: "Season 1",
              coverImageR2Filename: "image1",
              totalEpisodes: 3,
              description: "",
              averageRating: 4.5,
              ratingsCount: 99,
              createdTimeMs: 1000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "2020-01-01",
              endDate: "2020-12-01",
              grade: 10,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              state: EpisodeState.PUBLISHED,
              index: 1,
              name: "Episode 1",
              premiereTimeMs: 24000,
              videoContainer: {
                durationSec: 3600,
              },
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
          capabilities: {
            canConsume: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new GetSeasonAndEpisodeSummaryHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          "https://public_access_domain",
          () => new Date(1580544000000), // 2020-02-01T08:00:00.000Z
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            { seasonId: "season1", episodeId: "episode1" },
            "sessionStr",
          ),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newNotFoundError(
              `Season season1 or episode episode1 is not found.`,
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
      },
    },
    {
      name: "EpisodeNotPublished",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              name: "Season 1",
              coverImageR2Filename: "image1",
              totalEpisodes: 3,
              description: "",
              averageRating: 4.5,
              ratingsCount: 99,
              createdTimeMs: 1000,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "2020-01-01",
              endDate: "2020-12-01",
              grade: 10,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              state: EpisodeState.DRAFT,
              index: 1,
              name: "Episode 1",
              premiereTimeMs: 24000,
              videoContainer: {
                durationSec: 3600,
              },
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
          capabilities: {
            canConsume: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new GetSeasonAndEpisodeSummaryHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          "https://public_access_domain",
          () => new Date(1580544000000), // 2020-02-01T08:00:00.000Z
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            { seasonId: "season1", episodeId: "episode1" },
            "sessionStr",
          ),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newNotFoundError(
              `Season season1 or episode episode1 is not found.`,
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
      },
    },
    {
      name: "EpisodeNotFound",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              name: "Season 1",
              coverImageR2Filename: "image1",
              totalEpisodes: 3,
              description: "",
              averageRating: 4.5,
              ratingsCount: 99,
              createdTimeMs: 1000,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
          capabilities: {
            canConsume: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new GetSeasonAndEpisodeSummaryHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          "https://public_access_domain",
          () => new Date(1580544000000), // 2020-02-01T08:00:00.000Z
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            { seasonId: "season1", episodeId: "episode1" },
            "sessionStr",
          ),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newNotFoundError(
              `Season season1 or episode episode1 is not found.`,
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
      },
    },
  ],
});
