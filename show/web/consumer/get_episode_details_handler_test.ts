import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertEpisodeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { GetEpisodeDetailsHandler } from "./get_episode_details_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { GET_EPISODE_DETAILS_RESPONSE } from "@phading/product_service_interface/show/web/consumer/interface";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { newNotFoundError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "GetEpisodeDetailsHandlerTest",
  cases: [
    {
      name: "Default",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              lastChangeTimeMs: 100,
              totalEpisodes: 3,
            }),
            insertEpisodeStatement({
              episodeId: "episode1",
              seasonId: "season1",
              name: "Ep 1",
              index: 1,
              videoContainer: {
                resolution: "1080p",
                durationSec: 60,
                r2RootDirname: "root",
                r2MasterPlaylistFilename: "master.m3u8",
              },
              publishTimeMs: 200,
              premierTimeMs: 300,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
          capabilities: {
            canConsumeShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new GetEpisodeDetailsHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          "https://public.domain",
          () => 1000,
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "episode1",
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              episodeDetails: {
                name: "Ep 1",
                index: 1,
                resolution: "1080p",
                videoDurationSec: 60,
                premierTimeMs: 300,
                videoUrl: "https://public.domain/root/master.m3u8",
              },
            },
            GET_EPISODE_DETAILS_RESPONSE,
          ),
          "response",
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
      name: "EpisodeBeforePremier",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              lastChangeTimeMs: 100,
              totalEpisodes: 3,
            }),
            insertEpisodeStatement({
              episodeId: "episode1",
              seasonId: "season1",
              name: "Ep 1",
              index: 1,
              videoContainer: {
                resolution: "1080p",
                durationSec: 60,
                r2RootDirname: "root",
                r2MasterPlaylistFilename: "master.m3u8",
              },
              publishTimeMs: 200,
              premierTimeMs: 2000,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
          capabilities: {
            canConsumeShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new GetEpisodeDetailsHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          "https://public.domain",
          () => 1000,
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "episode1",
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              episodeDetails: {
                name: "Ep 1",
                index: 1,
                resolution: "1080p",
                videoDurationSec: 60,
                premierTimeMs: 2000,
              },
            },
            GET_EPISODE_DETAILS_RESPONSE,
          ),
          "response",
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
      name: "EpisodeNotPublished",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              lastChangeTimeMs: 100,
              totalEpisodes: 3,
            }),
            insertEpisodeStatement({
              episodeId: "episode1",
              seasonId: "season1",
              name: "Ep 1",
              index: 1,
              videoContainer: {
                resolution: "1080p",
                durationSec: 60,
                r2RootDirname: "root",
                r2MasterPlaylistFilename: "master.m3u8",
              },
              publishTimeMs: 2000,
              premierTimeMs: 300,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
          capabilities: {
            canConsumeShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new GetEpisodeDetailsHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          "https://public.domain",
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
            newNotFoundError("Season season1 episode episode1 is not found."),
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
      name: "SeasonNotPublished",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.DRAFT,
              lastChangeTimeMs: 100,
              totalEpisodes: 3,
            }),
            insertEpisodeStatement({
              episodeId: "episode1",
              seasonId: "season1",
              name: "Ep 1",
              index: 1,
              videoContainer: {
                resolution: "1080p",
                durationSec: 60,
                r2RootDirname: "root",
                r2MasterPlaylistFilename: "master.m3u8",
              },
              publishTimeMs: 200,
              premierTimeMs: 300,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
          capabilities: {
            canConsumeShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new GetEpisodeDetailsHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          "https://public.domain",
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
            newNotFoundError("Season season1 episode episode1 is not found."),
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
  ],
});
