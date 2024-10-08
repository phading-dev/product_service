import { StorageFake } from "../../../common/cloud_storage_fake";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { deleteSeasonStatement, insertSeasonStatement } from "../../../db/sql";
import { ListSeasonsHandler } from "./list_seasons_handler";
import { LIST_SEASONS_RESPONSE } from "@phading/product_service_interface/publisher/show/frontend/interface";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/backend/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

async function cleanupSeasons(): Promise<void> {
  try {
    await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([
        deleteSeasonStatement("season1"),
        deleteSeasonStatement("season2"),
        deleteSeasonStatement("season3"),
      ]);
      await transaction.commit();
    });
  } catch (e) {}
}

TEST_RUNNER.run({
  name: "ListSeasonHandlerTest",
  cases: [
    {
      name: "ListDraftsWithoutCursor",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "image1",
              1000,
              1000,
              SeasonState.DRAFT,
              0,
            ),
            insertSeasonStatement(
              "season2",
              "account1",
              "another name",
              "image2",
              1100,
              1100,
              SeasonState.DRAFT,
              0,
            ),
            insertSeasonStatement(
              "season3",
              "account1",
              "other names",
              "image3",
              1200,
              1200,
              SeasonState.PUBLISHED,
              0,
            ),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new ListSeasonsHandler(
          SPANNER_DATABASE,
          new StorageFake() as any,
          clientMock,
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            state: SeasonState.DRAFT,
          },
          "session1",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              seasons: [
                {
                  seasonId: "season2",
                  name: "another name",
                  coverImageUrl: "image2",
                  totalEpisodes: 0,
                  lastChangeTimestamp: 1100,
                },
                {
                  seasonId: "season1",
                  name: "a name",
                  coverImageUrl: "image1",
                  totalEpisodes: 0,
                  lastChangeTimestamp: 1000,
                },
              ],
              lastChangeTimeCursor: 1000,
            },
            LIST_SEASONS_RESPONSE,
          ),
          "response",
        );
      },
      tearDown: async () => {
        await cleanupSeasons();
      },
    },
    {
      name: "ListPublishedWithPrevCursor",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "image1",
              1000,
              1000,
              SeasonState.PUBLISHED,
              0,
            ),
            insertSeasonStatement(
              "season2",
              "account1",
              "another name",
              "image2",
              1100,
              1100,
              SeasonState.PUBLISHED,
              0,
            ),
            insertSeasonStatement(
              "season3",
              "account1",
              "other names",
              "image3",
              1200,
              1200,
              SeasonState.PUBLISHED,
              0,
            ),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new ListSeasonsHandler(
          SPANNER_DATABASE,
          new StorageFake() as any,
          clientMock,
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            state: SeasonState.PUBLISHED,
            lastChangeTimeCursor: 1200,
          },
          "session1",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              seasons: [
                {
                  seasonId: "season2",
                  name: "another name",
                  coverImageUrl: "image2",
                  totalEpisodes: 0,
                  lastChangeTimestamp: 1100,
                },
                {
                  seasonId: "season1",
                  name: "a name",
                  coverImageUrl: "image1",
                  totalEpisodes: 0,
                  lastChangeTimestamp: 1000,
                },
              ],
              lastChangeTimeCursor: 1000,
            },
            LIST_SEASONS_RESPONSE,
          ),
          "response",
        );
      },
      tearDown: async () => {
        await cleanupSeasons();
      },
    },
    {
      name: "ListArchivedWithCursor",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "image1",
              1000,
              1000,
              SeasonState.DRAFT,
              0,
            ),
            insertSeasonStatement(
              "season2",
              "account1",
              "another name",
              "image2",
              1100,
              1100,
              SeasonState.PUBLISHED,
              0,
            ),
            insertSeasonStatement(
              "season3",
              "account1",
              "other names",
              "image3",
              1200,
              1200,
              SeasonState.PUBLISHED,
              0,
            ),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new ListSeasonsHandler(
          SPANNER_DATABASE,
          new StorageFake() as any,
          clientMock,
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            state: SeasonState.ARCHIVED,
            lastChangeTimeCursor: 1200,
          },
          "session1",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              seasons: [],
              lastChangeTimeCursor: 1200,
            },
            LIST_SEASONS_RESPONSE,
          ),
          "response",
        );
      },
      tearDown: async () => {
        await cleanupSeasons();
      },
    },
  ],
});
