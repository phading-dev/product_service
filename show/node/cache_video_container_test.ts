import "../../local/env";
import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  GET_EPISODE_ROW,
  deleteSeasonStatement,
  getEpisode,
  insertEpisodeStatement,
  insertSeasonStatement,
} from "../../db/sql";
import { CacheVideoContainer } from "./cache_video_container";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { newBadRequestError, newNotFoundError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertReject, assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "CacheVideoContainerTest",
  cases: [
    {
      name: "FirstTimeCache",
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
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              publishTimeMs: 200,
            }),
          ]);
          await transaction.commit();
        });
        let handler = new CacheVideoContainer(SPANNER_DATABASE);

        // Execute
        await handler.handle("", {
          seasonId: "season1",
          episodeId: "episode1",
          videoContainer: {
            version: 1,
            durationSec: 60,
          },
        });

        // Verify
        assertThat(
          await getEpisode(SPANNER_DATABASE, "season1", "episode1"),
          isArray([
            eqMessage(
              {
                episodeData: {
                  seasonId: "season1",
                  episodeId: "episode1",
                  index: 1,
                  publishTimeMs: 200,
                  videoContainer: {
                    version: 1,
                    durationSec: 60,
                  },
                },
              },
              GET_EPISODE_ROW,
            ),
          ]),
          "episode",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([deleteSeasonStatement("season1")]);
          await transaction.commit();
        });
      },
    },
    {
      name: "VersionAlreadyNewer",
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
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              publishTimeMs: 200,
              videoContainerId: "container1",
              videoContainer: {
                version: 2,
                durationSec: 120,
              },
            }),
          ]);
          await transaction.commit();
        });
        let handler = new CacheVideoContainer(SPANNER_DATABASE);

        // Execute
        let error = await assertReject(
          handler.handle("", {
            seasonId: "season1",
            episodeId: "episode1",
            videoContainer: {
              version: 1,
              durationSec: 60,
            },
          }),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newBadRequestError(
              "Season season1 episode episode1 video container container1 already has version 2 which is newer than the request version 1.",
            ),
          ),
          "error",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([deleteSeasonStatement("season1")]);
          await transaction.commit();
        });
      },
    },
    {
      name: "EpisodeNotFound",
      execute: async () => {
        // Prepare
        let handler = new CacheVideoContainer(SPANNER_DATABASE);

        // Execute
        let error = await assertReject(
          handler.handle("", {
            seasonId: "season1",
            episodeId: "episode1",
            videoContainer: {
              version: 1,
              durationSec: 60,
            },
          }),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newNotFoundError("Season season1 episode episode1 is not found."),
          ),
          "error",
        );
      },
    },
  ],
});
