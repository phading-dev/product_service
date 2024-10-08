import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  insertEpisodeStatement,
  insertSeasonGradeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { GetMoreEpisodesHandler } from "./get_more_episodes_handler";
import { Statement } from "@google-cloud/spanner/build/src/transaction";
import { GET_MORE_EPISODES_RESPONSE } from "@phading/product_service_interface/consumer/show/frontend/interface";
import { EpisodeSummary } from "@phading/product_service_interface/consumer/show/frontend/season_details";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/backend/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

async function insertSeasonAndEpisodes(
  num: number,
  state: SeasonState,
): Promise<void> {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    let statements = new Array<Statement>();
    for (let i = 1; i <= num; i++) {
      statements.push(
        insertEpisodeStatement(
          "season1",
          `ep${i}`,
          `EP${i}`,
          i,
          `video${i}`,
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
        "publisher1",
        "a name",
        "file.jpg",
        1000,
        1000,
        state,
        num,
      ),
      insertSeasonGradeStatement("season1", "grade1", 15, 1000, 10000),
      ...statements,
    ]);
    await transaction.commit();
  });
}

async function cleanupSeason(): Promise<void> {
  try {
    await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([deleteSeasonStatement("season1")]);
      await transaction.commit();
    });
  } catch (e) {}
}

TEST_RUNNER.run({
  name: "GetMoreEpisodesHandlerTest",
  cases: [
    {
      name: "GetNextEpisodesUnitlNoMore",
      execute: async () => {
        // Prepare
        await insertSeasonAndEpisodes(30, SeasonState.PUBLISHED);
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "consumer1",
          },
          canConsumeShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new GetMoreEpisodesHandler(SPANNER_DATABASE, clientMock);

        {
          // Execute
          let response = await handler.handle(
            "",
            {
              seasonId: "season1",
              next: true,
              indexCursor: 5,
            },
            "session1",
          );

          // Verify
          let episodes = new Array<EpisodeSummary>();
          for (let i = 6; i <= 25; i++) {
            episodes.push({
              episodeId: `ep${i}`,
              name: `EP${i}`,
              index: i,
              videoDuration: 1200,
              premierTimestamp: 1000,
            });
          }
          assertThat(
            response,
            eqMessage(
              {
                episodes,
                indexCursor: 25,
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
              next: true,
              indexCursor: 25,
            },
            "session1",
          );

          // Verify
          let episodes = new Array<EpisodeSummary>();
          for (let i = 26; i <= 30; i++) {
            episodes.push({
              episodeId: `ep${i}`,
              name: `EP${i}`,
              index: i,
              videoDuration: 1200,
              premierTimestamp: 1000,
            });
          }
          assertThat(
            response,
            eqMessage(
              {
                episodes,
                indexCursor: 30,
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
              next: true,
              indexCursor: 30,
            },
            "session1",
          );

          // Verify
          assertThat(
            response,
            eqMessage(
              {
                episodes: [],
                indexCursor: 30,
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
      name: "GetPrevEpisodesUnitlNoMore",
      execute: async () => {
        // Prepare
        await insertSeasonAndEpisodes(30, SeasonState.PUBLISHED);
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "consumer1",
          },
          canConsumeShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new GetMoreEpisodesHandler(SPANNER_DATABASE, clientMock);

        {
          // Execute
          let response = await handler.handle(
            "",
            {
              seasonId: "season1",
              next: false,
              indexCursor: 25,
            },
            "session1",
          );

          // Verify
          let episodes = new Array<EpisodeSummary>();
          for (let i = 24; i >= 5; i--) {
            episodes.push({
              episodeId: `ep${i}`,
              name: `EP${i}`,
              index: i,
              videoDuration: 1200,
              premierTimestamp: 1000,
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
              next: false,
              indexCursor: 5,
            },
            "session1",
          );

          // Verify
          let episodes = new Array<EpisodeSummary>();
          for (let i = 4; i >= 1; i--) {
            episodes.push({
              episodeId: `ep${i}`,
              name: `EP${i}`,
              index: i,
              videoDuration: 1200,
              premierTimestamp: 1000,
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
              next: false,
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
      name: "SeasonNotPublished",
      execute: async () => {
        // Prepare
        await insertSeasonAndEpisodes(30, SeasonState.DRAFT);
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "consumer1",
          },
          canConsumeShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new GetMoreEpisodesHandler(SPANNER_DATABASE, clientMock);

        // Execute
        let response = await handler.handle(
          "",
          {
            seasonId: "season1",
            next: true,
            indexCursor: 5,
          },
          "session1",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              episodes: [],
              indexCursor: 5,
            },
            GET_MORE_EPISODES_RESPONSE,
          ),
          "response",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
  ],
});
