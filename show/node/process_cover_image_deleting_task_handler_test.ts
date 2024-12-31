import { SEASON_COVER_IMAGE_BUCKET_NAME } from "../../common/env_vars";
import { S3_CLIENT } from "../../common/s3_client";
import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  LIST_COVER_IMAGE_DELETING_TASKS_ROW,
  checkPresenceOfCoverImageFile,
  deleteCoverImageDeletingTaskStatement,
  deleteCoverImageFileStatement,
  insertCoverImageDeletingTaskStatement,
  insertCoverImageFileStatement,
  listCoverImageDeletingTasks,
} from "../../db/sql";
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
  cases: [
    {
      name: "Success",
      execute: async () => {
        // Prepare
        await S3_CLIENT.send(
          new PutObjectCommand({
            Bucket: SEASON_COVER_IMAGE_BUCKET_NAME,
            Key: "image1",
            Body: createReadStream("test_data/user_image.jpg"),
          }),
        );
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertCoverImageFileStatement("image1"),
            insertCoverImageDeletingTaskStatement("image1", 100, 0),
          ]);
          await transaction.commit();
        });
        let handler = new ProcessCoverImageDeletingTaskHandler(
          SPANNER_DATABASE,
          S3_CLIENT,
          () => 1000,
        );
        let delayResolveFn: () => void = () => {};
        let firstEncounterPromise = new Promise<void>((resolve1) => {
          handler.interfereFn = async () => {
            resolve1();
            await new Promise<void>((resolve2) => {
              delayResolveFn = resolve2;
            });
          };
        });

        // Execute
        handler.handle("", {
          r2Filename: "image1",
        });
        await firstEncounterPromise;

        // Verify
        assertThat(
          await listCoverImageDeletingTasks(SPANNER_DATABASE, 1000000),
          isArray([
            eqMessage(
              {
                coverImageDeletingTaskR2Filename: "image1",
                coverImageDeletingTaskExecutionTimeMs: 301000,
              },
              LIST_COVER_IMAGE_DELETING_TASKS_ROW,
            ),
          ]),
          "listCoverImageDeletingTasks",
        );

        // Execute
        delayResolveFn();
        await new Promise<void>((resolve) => {
          handler.doneCallback = resolve;
        });

        // Verify
        assertThat(
          (await checkPresenceOfCoverImageFile(SPANNER_DATABASE, "image1"))
            .length,
          eq(0),
          "coverImageFile",
        );
        assertThat(
          await listCoverImageDeletingTasks(SPANNER_DATABASE, 1000000),
          isArray([]),
          "listCoverImageDeletingTasks",
        );
        assertThat(
          (
            await S3_CLIENT.send(
              new ListObjectsV2Command({
                Bucket: SEASON_COVER_IMAGE_BUCKET_NAME,
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
        await S3_CLIENT.send(
          new DeleteObjectCommand({
            Bucket: SEASON_COVER_IMAGE_BUCKET_NAME,
            Key: "image1",
          }),
        );
      },
    },
  ],
});
