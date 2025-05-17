import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertEpisodeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { ListDraftEpisodesHandler } from "./list_draft_episodes_handler";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { LIST_DRAFT_EPISODES_RESPONSE } from "@phading/product_service_interface/show/web/publisher/interface";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "ListDraftEpisodesHandlerTest",
  cases: [
    {
      name: "Success",
      async execute() {
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
              name: "Ep 1",
              index: 1,
              videoContainerCached: {
                durationSec: 60,
              },
              state: EpisodeState.PUBLISHED,
              premiereTimeMs: 1000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode2",
              name: "Ep 2",
              index: 2,
              videoContainerCached: {
                durationSec: 120,
              },
              state: EpisodeState.DRAFT,
              premiereTimeMs: 2000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode3",
              name: "Ep 3",
              state: EpisodeState.DRAFT,
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
        let handler = new ListDraftEpisodesHandler(
          SPANNER_DATABASE,
          serviceClientMock,
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            seasonId: "season1",
          },
          "session1",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              episodes: [
                {
                  episodeId: "episode2",
                  name: "Ep 2",
                  index: 2,
                  videoContainer: {
                    durationSec: 120,
                  },
                  state: EpisodeState.DRAFT,
                  premiereTimeMs: 2000,
                },
                {
                  episodeId: "episode3",
                  name: "Ep 3",
                  state: EpisodeState.DRAFT,
                },
              ],
            },
            LIST_DRAFT_EPISODES_RESPONSE,
          ),
          "response",
        );
      },
      async tearDown() {
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
