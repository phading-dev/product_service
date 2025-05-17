import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertEpisodeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { GetEpisodeHandler } from "./get_episode_handler";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { GET_EPISODE_RESPONSE } from "@phading/product_service_interface/show/web/consumer/interface";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { newNotFoundError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "GetEpisodeHandlerTest",
  cases: [
    {
      name: "Default",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              state: SeasonState.PUBLISHED,
              createdTimeMs: 1000,
            }),
            insertEpisodeStatement({
              episodeId: "episode1",
              seasonId: "season1",
              name: "Ep 1",
              index: 1,
              videoContainerCached: {
                resolution: "1080p",
                durationSec: 60,
              },
              state: EpisodeState.PUBLISHED,
              premiereTimeMs: 300,
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
        let handler = new GetEpisodeHandler(SPANNER_DATABASE);

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
              episode: {
                episodeId: "episode1",
                name: "Ep 1",
                index: 1,
                resolution: "1080p",
                videoDurationSec: 60,
                premiereTimeMs: 300,
              },
            },
            GET_EPISODE_RESPONSE,
          ),
          "response",
        );
      },
      tearDown: async () => {
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
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              state: SeasonState.PUBLISHED,
              createdTimeMs: 1000,
            }),
            insertEpisodeStatement({
              episodeId: "episode1",
              seasonId: "season1",
              name: "Ep 1",
              index: 1,
              videoContainerCached: {
                resolution: "1080p",
                durationSec: 60,
              },
              state: EpisodeState.DRAFT,
              premiereTimeMs: 300,
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
        let handler = new GetEpisodeHandler(SPANNER_DATABASE);

        // Execute
        let error = await assertReject(
          handler.handle("", {
            seasonId: "season1",
            episodeId: "episode1",
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
      tearDown: async () => {
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
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              state: SeasonState.DRAFT,
              createdTimeMs: 1000,
            }),
            insertEpisodeStatement({
              episodeId: "episode1",
              seasonId: "season1",
              name: "Ep 1",
              index: 1,
              videoContainerCached: {
                resolution: "1080p",
                durationSec: 60,
              },
              state: EpisodeState.PUBLISHED,
              premiereTimeMs: 300,
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
        let handler = new GetEpisodeHandler(SPANNER_DATABASE);

        // Execute
        let error = await assertReject(
          handler.handle("", {
            seasonId: "season1",
            episodeId: "episode1",
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
      tearDown: async () => {
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
