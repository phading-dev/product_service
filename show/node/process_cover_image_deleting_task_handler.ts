import { S3_CLIENT } from "../../common/s3_client";
import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  deleteCoverImageDeletingTaskStatement,
  deleteCoverImageFileStatement,
  getCoverImageDeletingTaskMetadata,
  updateCoverImageDeletingTaskMetadataStatement,
} from "../../db/sql";
import { ENV_VARS } from "../../env_vars";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Database } from "@google-cloud/spanner";
import { ProcessCoverImageDeletingTaskHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  ProcessCoverImageDeletingTaskRequestBody,
  ProcessCoverImageDeletingTaskResponse,
} from "@phading/product_service_interface/show/node/interface";
import { newBadRequestError } from "@selfage/http_error";
import { Ref } from "@selfage/ref";
import { ProcessTaskHandlerWrapper } from "@selfage/service_handler/process_task_handler_wrapper";

export class ProcessCoverImageDeletingTaskHandler extends ProcessCoverImageDeletingTaskHandlerInterface {
  public static create(): ProcessCoverImageDeletingTaskHandler {
    return new ProcessCoverImageDeletingTaskHandler(
      SPANNER_DATABASE,
      S3_CLIENT,
      () => Date.now(),
    );
  }

  private taskHandler: ProcessTaskHandlerWrapper;

  public constructor(
    private database: Database,
    private s3Client: Ref<S3Client>,
    private getNow: () => number,
  ) {
    super();
    this.taskHandler = ProcessTaskHandlerWrapper.create(
      this.descriptor,
      5 * 60 * 1000,
      24 * 60 * 60 * 1000,
    );
  }

  public async handle(
    loggingPrefix: string,
    body: ProcessCoverImageDeletingTaskRequestBody,
  ): Promise<ProcessCoverImageDeletingTaskResponse> {
    loggingPrefix = `${loggingPrefix} Cover image deleting task for file ${body.r2Filename}:`;
    await this.taskHandler.wrap(
      loggingPrefix,
      () => this.claimTask(loggingPrefix, body),
      () => this.processTask(loggingPrefix, body),
    );
    return {};
  }

  public async claimTask(
    loggingPrefix: string,
    body: ProcessCoverImageDeletingTaskRequestBody,
  ): Promise<void> {
    await this.database.runTransactionAsync(async (transaction) => {
      let rows = await getCoverImageDeletingTaskMetadata(transaction, {
        coverImageDeletingTaskR2FilenameEq: body.r2Filename,
      });
      if (rows.length === 0) {
        throw newBadRequestError("Task is not found.");
      }
      let task = rows[0];
      await transaction.batchUpdate([
        updateCoverImageDeletingTaskMetadataStatement({
          coverImageDeletingTaskR2FilenameEq: body.r2Filename,
          setRetryCount: task.coverImageDeletingTaskRetryCount + 1,
          setExecutionTimeMs:
            this.getNow() +
            this.taskHandler.getBackoffTime(
              task.coverImageDeletingTaskRetryCount,
            ),
        }),
      ]);
      await transaction.commit();
    });
  }

  public async processTask(
    loggingPrefix: string,
    body: ProcessCoverImageDeletingTaskRequestBody,
  ): Promise<void> {
    await this.s3Client.val.send(
      new DeleteObjectCommand({
        Bucket: ENV_VARS.r2SeasonCoverImageBucketName,
        Key: body.r2Filename,
      }),
    );
    await this.database.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([
        deleteCoverImageFileStatement({
          coverImageFileR2FilenameEq: body.r2Filename,
        }),
        deleteCoverImageDeletingTaskStatement({
          coverImageDeletingTaskR2FilenameEq: body.r2Filename,
        }),
      ]);
      await transaction.commit();
    });
  }
}
