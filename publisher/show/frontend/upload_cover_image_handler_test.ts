import { FakeBucket } from "../../../common/cloud_storage_fake";
import { deleteSeason, getSeasonMetadata, insertSeason } from "../../../db/sql";
import { UploadCoverImageHandler } from "./upload_cover_image_handler";
import { Spanner } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/backend/interface";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import {
  assertReject,
  assertThat,
  containStr,
  eq,
  ne,
} from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";
import { createReadStream, existsSync, unlinkSync } from "fs";

let TEST_DATABASE = new Spanner({
  projectId: "local-project",
})
  .instance("test-instance")
  .database("test-database");

TEST_RUNNER.run({
  name: "UploadCoverImageHandlerTest",
  cases: [
    {
      name: "Success",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account1",
            "a name",
            "test_data/copied.jpg",
            SeasonState.DRAFT,
            0,
          );
          await transaction.commit();
        });
        let prevTimestamps = (
          await getSeasonMetadata(
            (query) => TEST_DATABASE.run(query),
            "season1",
            "account1",
          )
        )[0].seasonLastChangeTimestamp;
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UploadCoverImageHandler(
          TEST_DATABASE,
          new FakeBucket() as any,
          clientMock,
        );

        // Execute
        await handler.handle(
          "",
          createReadStream("test_data/user_image.jpg"),
          {
            seasonId: "season1",
          },
          "session1",
        );

        // Verify
        assertThat(existsSync("test_data/copied.jpg"), eq(true), "exists");
        let lastChangeTimestamp = (
          await getSeasonMetadata(
            (query) => TEST_DATABASE.run(query),
            "season1",
            "account1",
          )
        )[0].seasonLastChangeTimestamp;
        assertThat(
          lastChangeTimestamp,
          ne(prevTimestamps),
          "last change timestamp",
        );
      },
      tearDown: async () => {
        try {
          await TEST_DATABASE.runTransactionAsync(async (transaction) => {
            await deleteSeason((query) => transaction.run(query), "season1");
            await transaction.commit();
          });
          unlinkSync("test_data/copied.jpg");
        } catch (e) {}
      },
    },
    {
      name: "SeasonNotOwned",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account2",
            "a name",
            "test_data/copied.jpg",
            SeasonState.DRAFT,
            0,
          );
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UploadCoverImageHandler(
          TEST_DATABASE,
          new FakeBucket() as any,
          clientMock,
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            createReadStream("test_data/user_image.jpg"),
            {
              seasonId: "season1",
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
        try {
          await TEST_DATABASE.runTransactionAsync(async (transaction) => {
            await deleteSeason((query) => transaction.run(query), "season1");
            await transaction.commit();
          });
        } catch (e) {}
      },
    },
    {
      name: "SeasonArchived",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account1",
            "a name",
            "test_data/copied.jpg",
            SeasonState.ARCHIVED,
            0,
          );
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UploadCoverImageHandler(
          TEST_DATABASE,
          new FakeBucket() as any,
          clientMock,
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            createReadStream("test_data/user_image.jpg"),
            {
              seasonId: "season1",
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr("Season season1 is archived"),
          "error",
        );
      },
      tearDown: async () => {
        try {
          await TEST_DATABASE.runTransactionAsync(async (transaction) => {
            await deleteSeason((query) => transaction.run(query), "season1");
            await transaction.commit();
          });
        } catch (e) {}
      },
    },
  ],
});
