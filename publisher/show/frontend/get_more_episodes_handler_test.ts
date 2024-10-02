import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertEpisodeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { GetMoreEpisodesHandler } from "./get_more_episodes_handler";
import { Statement } from "@google-cloud/spanner/build/src/transaction";
import { GET_MORE_EPISODES_RESPONSE } from "@phading/product_service_interface/publisher/show/frontend/interface";
import { Episode } from "@phading/product_service_interface/publisher/show/frontend/season_details";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/backend/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat, containStr } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

async function insertEpisodes(): Promise<void> {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    let statements = new Array<Statement>();
    for (let i = 1; i <= 30; i++) {
      statements.push(
        insertEpisodeStatement(
          "season1",
          `ep${i}`,
          undefined,
          i,
          "video",
          1200,
          1300,
          1000,
          1000,
        ),
      );
    }
    await transaction.batchUpdate([
      insertSeasonStatement(
        "season1",
        "account1",
        "a name",
        "file.jpg",
        1000,
        1000,
        SeasonState.PUBLISHED,
        0,
      ),
      ...statements,
    ]);
    await transaction.commit();
  });
}

async function cleanupSeason(): Promise<void> {
  try {
    await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
      await transaction.runUpdate(deleteSeasonStatement("season1"));
      await transaction.commit();
    });
  } catch (e) {}
}

TEST_RUNNER.run({
  name: "GetMoreEpisodesHanlderTest",
  cases: [
    {
      name: "GetMoreUntilExhausted",
      execute: async () => {
        // Prepare
        await insertEpisodes();
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new GetMoreEpisodesHandler(SPANNER_DATABASE, clientMock);

        {
          // Execute
          let response = await handler.handle(
            "",
            {
              seasonId: "season1",
              indexCursor: 25,
            },
            "session1",
          );

          // Verify
          let episodes = new Array<Episode>();
          for (let i = 24; i >= 5; i--) {
            episodes.push({
              episodeId: `ep${i}`,
              index: i,
              videoLength: 1200,
              videoSize: 1300,
              premierTimestamp: 1000,
              publishedTimestamp: 1000,
            });
          }
          assertThat(
            response,
            eqMessage(
              {
                episodes,
                indexCursor: 5,
              },
              GET_MORE_EPISODES_RESPONSE,
            ),
            "response",
          );
        }

        {
          // Execute
          let response = await handler.handle(
            "",
            {
              seasonId: "season1",
              indexCursor: 5,
            },
            "session1",
          );

          // Verify
          let episodes = new Array<Episode>();
          for (let i = 4; i >= 1; i--) {
            episodes.push({
              episodeId: `ep${i}`,
              index: i,
              videoLength: 1200,
              videoSize: 1300,
              premierTimestamp: 1000,
              publishedTimestamp: 1000,
            });
          }
          assertThat(
            response,
            eqMessage(
              {
                episodes,
                indexCursor: 1,
              },
              GET_MORE_EPISODES_RESPONSE,
            ),
            "response",
          );
        }

        {
          // Execute
          let response = await handler.handle(
            "",
            {
              seasonId: "season1",
              indexCursor: 1,
            },
            "session1",
          );

          // Verify
          assertThat(
            response,
            eqMessage(
              {
                episodes: [],
                indexCursor: 1,
              },
              GET_MORE_EPISODES_RESPONSE,
            ),
            "response",
          );
        }
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "SeasonNotOwned",
      execute: async () => {
        // Prepare
        await insertEpisodes();
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account2",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new GetMoreEpisodesHandler(SPANNER_DATABASE, clientMock);

        // Execute
        let errors = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              indexCursor: 25,
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          errors.message,
          containStr("Season season1 is not found"),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
  ],
});
