import "../../../local/env";
import { FAR_FUTURE_TIME_MS } from "../../../common/constants";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_EPISODE_ROW,
  GET_SEASON_ROW,
  deleteSeasonStatement,
  getEpisode,
  getSeason,
  insertEpisodeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { UnpublishEpisodeHandler } from "./unpublish_episode_handler";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "UnpublishEpisodeHandlerTest",
  cases: [
    {
      name: "Success",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              publishTimeMs: 200,
              premierTimeMs: 300,
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
                seasonRecentPremierTimeMs: FAR_FUTURE_TIME_MS,
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
                episodePublishTimeMs: FAR_FUTURE_TIME_MS,
                episodePremierTimeMs: FAR_FUTURE_TIME_MS,
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
  ],
});
