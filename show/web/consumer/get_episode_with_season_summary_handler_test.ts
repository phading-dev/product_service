import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertEpisodeStatement,
  insertSeasonGradeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { GetEpisodeWithSeasonSummaryHandler } from "./get_episode_with_season_summary_handler";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { GET_EPISODE_WITH_SEASON_SUMMARY_RESPONSE } from "@phading/product_service_interface/show/web/consumer/interface";
import { newNotFoundError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertReject, assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "GetEpisodeWithSeasonSummaryHandlerTest",
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
              videoContainerCached: {
                durationSec: 3600,
                resolution: "1080p",
              },
            }),
          ]);
          await transaction.commit();
        });
        let handler = new GetEpisodeWithSeasonSummaryHandler(
          SPANNER_DATABASE,
          "https://public_access_domain",
          () => new Date("2020-02-01T08:00:00.000Z"),
        );

        // Execute
        let response = await handler.handle("", {
          seasonId: "season1",
          episodeId: "episode1",
        });

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
                  averageRating: 4.5,
                  ratingsCount: 99,
                },
                episode: {
                  episodeId: "episode1",
                  index: 1,
                  name: "Episode 1",
                  premiereTimeMs: 24000,
                  videoDurationSec: 3600,
                  resolution: "1080p",
                },
              },
            },
            GET_EPISODE_WITH_SEASON_SUMMARY_RESPONSE,
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
              videoContainerCached: {
                durationSec: 3600,
                resolution: "1080p",
              },
            }),
          ]);
          await transaction.commit();
        });
        let handler = new GetEpisodeWithSeasonSummaryHandler(
          SPANNER_DATABASE,
          "https://public_access_domain",
          () => new Date("2020-02-01T08:00:00.000Z"),
        );

        // Execute
        let error = await assertReject(
          handler.handle("", { seasonId: "season1", episodeId: "episode1" }),
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
              videoContainerCached: {
                durationSec: 3600,
                resolution: "1080p",
              },
            }),
          ]);
          await transaction.commit();
        });
        let handler = new GetEpisodeWithSeasonSummaryHandler(
          SPANNER_DATABASE,
          "https://public_access_domain",
          () => new Date("2020-02-01T08:00:00.000Z"),
        );

        // Execute
        let error = await assertReject(
          handler.handle("", { seasonId: "season1", episodeId: "episode1" }),
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
              description: "",
              averageRating: 4.5,
              ratingsCount: 99,
              createdTimeMs: 1000,
            }),
          ]);
          await transaction.commit();
        });
        let handler = new GetEpisodeWithSeasonSummaryHandler(
          SPANNER_DATABASE,
          "https://public_access_domain",
          () => new Date("2020-02-01T08:00:00.000Z"),
        );

        // Execute
        let error = await assertReject(
          handler.handle("", { seasonId: "season1", episodeId: "episode1" }),
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
