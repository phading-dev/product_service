import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  getEpisodeDraft,
  getLastEpisodes,
  getSeasonMetadata,
  insertEpisodeDraftStatement,
  insertEpisodeStatement,
  insertSeasonStatement,
  updateEpisodeDraftUploadedVideoStatement,
} from "../../../db/sql";
import { PublishEpisodeHandler } from "./publish_episode_handler";
import { PUBLISH_EPISODE_RESPONSE } from "@phading/product_service_interface/publisher/show/frontend/interface";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { VideoState } from "@phading/product_service_interface/publisher/show/video_state";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/backend/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import {
  assertReject,
  assertThat,
  containStr,
  eq,
} from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

async function cleanupSeason(): Promise<void> {
  try {
    await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([deleteSeasonStatement("season1")]);
      await transaction.commit();
    });
  } catch (e) {}
}

TEST_RUNNER.run({
  name: "PublishEpisodeHandlerTest",
  cases: [
    {
      name: "PublishTheFirstEpisode",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "file.jpg",
              1000,
              1000,
              SeasonState.DRAFT,
              0,
            ),
            insertEpisodeDraftStatement(
              "season1",
              "ep1",
              undefined,
              "video",
              VideoState.INCOMPLETE,
              {},
            ),
            updateEpisodeDraftUploadedVideoStatement(
              VideoState.UPLOADED,
              {},
              1200,
              1300,
              1400,
              "season1",
              "ep1",
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
        let nowTimestamp = 2000;
        let handle = new PublishEpisodeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => nowTimestamp,
        );

        // Execute
        let response = await handle.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "ep1",
          },
          "session1",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              episode: {
                episodeId: "ep1",
                index: 1,
                videoDuration: 1300,
                videoSize: 1400,
                publishedTimestamp: nowTimestamp,
                premierTimestamp: nowTimestamp,
              },
              refreshSeason: true,
            },
            PUBLISH_EPISODE_RESPONSE,
          ),
          "response",
        );
        let metadata = (
          await getSeasonMetadata(SPANNER_DATABASE, "season1", "account1")
        )[0];
        assertThat(
          metadata.seasonState,
          eq(SeasonState.PUBLISHED),
          "season state",
        );
        assertThat(metadata.seasonTotalEpisodes, eq(1), "total episodes");
        assertThat(
          metadata.seasonLastChangeTimestamp,
          eq(nowTimestamp),
          "last change timestamp",
        );
        let drafts = await getEpisodeDraft(SPANNER_DATABASE, "season1", "ep1");
        assertThat(drafts.length, eq(0), "# of drafts");
        let eps = await getLastEpisodes(SPANNER_DATABASE, "season1");
        assertThat(eps.length, eq(1), "# of episodes");
        assertThat(eps[0].episodeIndex, eq(1), "ep index");
        assertThat(eps[0].episodeEpisodeId, eq("ep1"), "ep id");
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "PublishTheSecondEpisodeWithPremierTime",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "file.jpg",
              1000,
              1000,
              SeasonState.PUBLISHED,
              1,
            ),
            insertEpisodeStatement(
              "season1",
              "ep1",
              undefined,
              1,
              "video",
              1200,
              1300,
              1000,
              1000,
            ),
            insertEpisodeDraftStatement(
              "season1",
              "ep2",
              undefined,
              "video",
              VideoState.INCOMPLETE,
              {},
            ),
            updateEpisodeDraftUploadedVideoStatement(
              VideoState.UPLOADED,
              {},
              1200,
              1300,
              1400,
              "season1",
              "ep2",
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
        let nowTimestamp = 2000;
        let handle = new PublishEpisodeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => nowTimestamp,
        );

        // Execute
        let response = await handle.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "ep2",
            premierTimestamp: 10000,
          },
          "session1",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              episode: {
                episodeId: "ep2",
                index: 2,
                videoDuration: 1300,
                videoSize: 1400,
                publishedTimestamp: nowTimestamp,
                premierTimestamp: 10000,
              },
              refreshSeason: false,
            },
            PUBLISH_EPISODE_RESPONSE,
          ),
          "response",
        );
        let metadata = (
          await getSeasonMetadata(SPANNER_DATABASE, "season1", "account1")
        )[0];
        assertThat(metadata.seasonTotalEpisodes, eq(2), "total episodes");
        assertThat(
          metadata.seasonLastChangeTimestamp,
          eq(nowTimestamp),
          "last change timestamp",
        );
        let drafts = await getEpisodeDraft(SPANNER_DATABASE, "season1", "ep1");
        assertThat(drafts.length, eq(0), "# of drafts");
        let eps = await getLastEpisodes(SPANNER_DATABASE, "season1");
        assertThat(eps.length, eq(2), "# of episodes");
        assertThat(eps[0].episodeIndex, eq(2), "ep index");
        assertThat(eps[0].episodeEpisodeId, eq("ep2"), "ep id");
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "SeasonNotOwned",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "file.jpg",
              1000,
              1000,
              SeasonState.DRAFT,
              0,
            ),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account2",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handle = new PublishEpisodeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 2000,
        );

        // Execute
        let error = await assertReject(
          handle.handle(
            "",
            {
              seasonId: "season1",
              episodeId: "ep1",
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr("Season season1 is not found"),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "DraftNotFound",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "file.jpg",
              1000,
              1000,
              SeasonState.DRAFT,
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
        let handle = new PublishEpisodeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 2000,
        );

        // Execute
        let error = await assertReject(
          handle.handle(
            "",
            {
              seasonId: "season1",
              episodeId: "ep1",
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr("Season season1 episode draft ep1 is not found"),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "DraftNotFound",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "file.jpg",
              1000,
              1000,
              SeasonState.DRAFT,
              0,
            ),
            insertEpisodeDraftStatement(
              "season1",
              "ep1",
              undefined,
              "video",
              VideoState.INCOMPLETE,
              {},
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
        let handle = new PublishEpisodeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 2000,
        );

        // Execute
        let error = await assertReject(
          handle.handle(
            "",
            {
              seasonId: "season1",
              episodeId: "ep1",
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr(
            "Video is not completely uploaded yet for season season1 episode draft ep1",
          ),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "DraftWithNonZeroEpisodes",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "file.jpg",
              1000,
              1000,
              SeasonState.DRAFT,
              1,
            ),
            insertEpisodeDraftStatement(
              "season1",
              "ep1",
              undefined,
              "video",
              VideoState.INCOMPLETE,
              {},
            ),
            updateEpisodeDraftUploadedVideoStatement(
              VideoState.UPLOADED,
              {},
              1200,
              1300,
              1400,
              "season1",
              "ep1",
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
        let handle = new PublishEpisodeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 2000,
        );

        // Execute
        let error = await assertReject(
          handle.handle(
            "",
            {
              seasonId: "season1",
              episodeId: "ep1",
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr(
            "Season season1 is in draft state but with non-zero episodes",
          ),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
  ],
});
