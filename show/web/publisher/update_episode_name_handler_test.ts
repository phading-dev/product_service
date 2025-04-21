import "../../../local/env";
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
import { UpdateEpisodeNameHandler } from "./update_episode_name_handler";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "UpdateEpisodeNameHandlerTest",
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
              createdTimeMs: 1000,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              name: "A name",
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
        let handler = new UpdateEpisodeNameHandler(
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
            name: "Another name",
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
                seasonCreatedTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "Season",
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
                episodeName: "Another name",
              },
              GET_EPISODE_ROW,
            ),
          ]),
          "Episode",
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
