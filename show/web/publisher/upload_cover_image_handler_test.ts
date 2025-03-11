import "../../../local/env";
import { S3_CLIENT, initS3Client } from "../../../common/s3_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_COVER_IMAGE_DELETING_TASK_ROW,
  GET_SEASON_ROW,
  checkPresenceOfCoverImageFile,
  deleteCoverImageDeletingTaskStatement,
  deleteCoverImageFileStatement,
  deleteSeasonStatement,
  getCoverImageDeletingTask,
  getSeason,
  insertSeasonStatement,
} from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { UploadCoverImageHandler } from "./upload_cover_image_handler";
import { DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { newBadRequestError } from "@selfage/http_error";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import {
  assertReject,
  assertThat,
  eq,
  eqError,
  isArray,
} from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";
import { createReadStream } from "fs";

let ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

async function cleanUpAll() {
  await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
    await transaction.batchUpdate([
      deleteSeasonStatement("season1"),
      deleteCoverImageFileStatement("image1"),
      deleteCoverImageFileStatement("image2"),
      deleteCoverImageDeletingTaskStatement("image1"),
      deleteCoverImageDeletingTaskStatement("image2"),
    ]);
    await transaction.commit();
  });
  await S3_CLIENT.val.send(
    new DeleteObjectCommand({
      Bucket: ENV_VARS.r2SeasonCoverImageBucketName,
      Key: "image2",
    }),
  );
}

TEST_RUNNER.run({
  name: "UploadCoverImageHandlerTest",
  environment: {
    async setUp() {
      await initS3Client();
    },
  },
  cases: [
    {
      name: "Stalled_Success",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              coverImageR2Filename: "image1",
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublishShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UploadCoverImageHandler(
          SPANNER_DATABASE,
          S3_CLIENT,
          serviceClientMock,
          () => 1000,
          () => "image2",
        );
        let delayResolveFn: () => void;
        let firstEncounterPromise = new Promise<void>((resolve1) => {
          handler.interferFn = async () => {
            resolve1();
            await new Promise<void>((resolve2) => {
              delayResolveFn = resolve2;
            });
          };
        });

        // Execute
        let responsePromise = handler.handle(
          "",
          createReadStream("test_data/user_image.jpg"),
          {
            seasonId: "season1",
          },
          "session",
        );
        await firstEncounterPromise;

        // Verify
        assertThat(
          (await checkPresenceOfCoverImageFile(SPANNER_DATABASE, "image2"))
            .length,
          eq(1),
          "coverImageFile",
        );
        assertThat(
          await getCoverImageDeletingTask(SPANNER_DATABASE, "image2"),
          isArray([
            eqMessage(
              {
                coverImageDeletingTaskR2Filename: "image2",
                coverImageDeletingTaskRetryCount: 0,
                coverImageDeletingTaskExecutionTimeMs: 1000 + ONE_YEAR_MS,
                coverImageDeletingTaskCreatedTimeMs: 1000,
              },
              GET_COVER_IMAGE_DELETING_TASK_ROW,
            ),
          ]),
          "coverImageDeletingTasks",
        );

        // Execute
        delayResolveFn();
        await responsePromise;

        // Verify
        assertThat(
          await getSeason(SPANNER_DATABASE, "season1"),
          isArray([
            eqMessage(
              {
                seasonData: {
                  seasonId: "season1",
                  publisherId: "publisher1",
                  state: SeasonState.PUBLISHED,
                  coverImageR2Filename: "image2",
                  lastChangeTimeMs: 1000,
                  recentPremierTimeMs: 100,
                },
              },
              GET_SEASON_ROW,
            ),
          ]),
          "season",
        );
        assertThat(
          await getCoverImageDeletingTask(SPANNER_DATABASE, "image1"),
          isArray([
            eqMessage(
              {
                coverImageDeletingTaskR2Filename: "image1",
                coverImageDeletingTaskRetryCount: 0,
                coverImageDeletingTaskExecutionTimeMs: 1000,
                coverImageDeletingTaskCreatedTimeMs: 1000,
              },
              GET_COVER_IMAGE_DELETING_TASK_ROW,
            ),
          ]),
          "coverImageDeletingTasks",
        );
        assertThat(
          (
            await S3_CLIENT.val.send(
              new ListObjectsV2Command({
                Bucket: ENV_VARS.r2SeasonCoverImageBucketName,
                Prefix: "image2",
              }),
            )
          ).Contents?.length,
          eq(1),
          "image2",
        );
      },
      tearDown: async () => {
        await cleanUpAll();
      },
    },
    {
      name: "Interfered_Cleanup",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              coverImageR2Filename: "image1",
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublishShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UploadCoverImageHandler(
          SPANNER_DATABASE,
          S3_CLIENT,
          serviceClientMock,
          () => 1000,
          () => "image2",
        );
        handler.interferFn = async () => {
          throw new Error("Fake error.");
        };

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            createReadStream("test_data/user_image.jpg"),
            {
              seasonId: "season1",
            },
            "session",
          ),
        );

        // Verify
        assertThat(error, eqError(new Error("Fake error")), "error");
        assertThat(
          await getSeason(SPANNER_DATABASE, "season1"),
          isArray([
            eqMessage(
              {
                seasonData: {
                  seasonId: "season1",
                  publisherId: "publisher1",
                  state: SeasonState.PUBLISHED,
                  coverImageR2Filename: "image1",
                  lastChangeTimeMs: 100,
                  recentPremierTimeMs: 100,
                },
              },
              GET_SEASON_ROW,
            ),
          ]),
          "season",
        );
        assertThat(
          (await checkPresenceOfCoverImageFile(SPANNER_DATABASE, "image2"))
            .length,
          eq(1),
          "coverImageFile",
        );
        assertThat(
          await getCoverImageDeletingTask(SPANNER_DATABASE, "image2"),
          isArray([
            eqMessage(
              {
                coverImageDeletingTaskR2Filename: "image2",
                coverImageDeletingTaskRetryCount: 0,
                coverImageDeletingTaskExecutionTimeMs: 301000,
                coverImageDeletingTaskCreatedTimeMs: 1000,
              },
              GET_COVER_IMAGE_DELETING_TASK_ROW,
            ),
          ]),
          "coverImageDeletingTasks",
        );
      },
      tearDown: async () => {
        await cleanUpAll();
      },
    },
    {
      name: "SeasonArchived",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.ARCHIVED,
              coverImageR2Filename: "image1",
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublishShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UploadCoverImageHandler(
          SPANNER_DATABASE,
          S3_CLIENT,
          serviceClientMock,
          () => 1000,
          () => "image2",
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            createReadStream("test_data/user_image.jpg"),
            {
              seasonId: "season1",
            },
            "session",
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            newBadRequestError(
              "Season season1 is archived and cannot be updated anymore.",
            ),
          ),
          "error",
        );
      },
      tearDown: async () => {
        await cleanUpAll();
      },
    },
  ],
});
