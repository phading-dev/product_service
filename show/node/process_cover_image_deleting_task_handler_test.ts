import { S3_CLIENT, initS3Client } from "../../common/s3_client";
import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  GET_COVER_IMAGE_DELETING_TASK_METADATA_ROW,
  checkPresenceOfCoverImageFile,
  deleteCoverImageDeletingTaskStatement,
  deleteCoverImageFileStatement,
  getCoverImageDeletingTaskMetadata,
  insertCoverImageDeletingTaskStatement,
  insertCoverImageFileStatement,
  listPendingCoverImageDeletingTasks,
} from "../../db/sql";
import { ENV_VARS } from "../../env";
import { ProcessCoverImageDeletingTaskHandler } from "./process_cover_image_deleting_task_handler";
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertThat, eq, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";
import { createReadStream } from "fs";

TEST_RUNNER.run({
  name: "ProcessCoverImageDeletingTaskHandlerTest",
  environment: {
    async setUp() {
      await initS3Client();
    },
  },
  cases: [
    {
      name: "ProcessTask",
      execute: async () => {
        // Prepare
        await S3_CLIENT.val.send(
          new PutObjectCommand({
            Bucket: ENV_VARS.r2SeasonCoverImageBucketName,
            Key: "image1",
            Body: createReadStream("test_data/user_image.jpg"),
          }),
        );
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertCoverImageFileStatement("image1"),
            insertCoverImageDeletingTaskStatement("image1", 0, 100, 0),
          ]);
          await transaction.commit();
        });
        let handler = new ProcessCoverImageDeletingTaskHandler(
          SPANNER_DATABASE,
          S3_CLIENT,
          () => 1000,
        );

        // Execute
        await handler.processTask("", {
          r2Filename: "image1",
        });

        // Verify
        assertThat(
          (await checkPresenceOfCoverImageFile(SPANNER_DATABASE, "image1"))
            .length,
          eq(0),
          "coverImageFile",
        );
        assertThat(
          await listPendingCoverImageDeletingTasks(SPANNER_DATABASE, 1000000),
          isArray([]),
          "listCoverImageDeletingTasks",
        );
        assertThat(
          (
            await S3_CLIENT.val.send(
              new ListObjectsV2Command({
                Bucket: ENV_VARS.r2SeasonCoverImageBucketName,
                Prefix: "image",
              }),
            )
          ).Contents,
          eq(undefined),
          "images",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteCoverImageFileStatement("image1"),
            deleteCoverImageDeletingTaskStatement("image1"),
          ]);
          await transaction.commit();
        });
        await S3_CLIENT.val.send(
          new DeleteObjectCommand({
            Bucket: ENV_VARS.r2SeasonCoverImageBucketName,
            Key: "image1",
          }),
        );
      },
    },
    {
      name: "ClaimTask",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertCoverImageDeletingTaskStatement("image1", 0, 100, 0),
          ]);
          await transaction.commit();
        });
        let handler = new ProcessCoverImageDeletingTaskHandler(
          SPANNER_DATABASE,
          S3_CLIENT,
          () => 1000,
        );

        // Execute
        await handler.claimTask("", {
          r2Filename: "image1",
        });

        // Verify
        assertThat(
          await getCoverImageDeletingTaskMetadata(SPANNER_DATABASE, "image1"),
          isArray([
            eqMessage(
              {
                coverImageDeletingTaskRetryCount: 1,
                coverImageDeletingTaskExecutionTimeMs: 301000,
              },
              GET_COVER_IMAGE_DELETING_TASK_METADATA_ROW,
            ),
          ]),
          "coverImageDeletingTask",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteCoverImageDeletingTaskStatement("image1"),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
