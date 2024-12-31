import { SEASON_COVER_IMAGE_BUCKET_NAME } from "../../common/env_vars";
import { S3_CLIENT } from "../../common/s3_client";
import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  deleteCoverImageDeletingTaskStatement,
  deleteCoverImageFileStatement,
  updateCoverImageDeletingTaskStatement,
} from "../../db/sql";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Database } from "@google-cloud/spanner";
import { ProcessCoverImageDeletingTaskHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  ProcessCoverImageDeletingTaskRequestBody,
  ProcessCoverImageDeletingTaskResponse,
} from "@phading/product_service_interface/show/node/interface";

export class ProcessCoverImageDeletingTaskHandler extends ProcessCoverImageDeletingTaskHandlerInterface {
  public static create(): ProcessCoverImageDeletingTaskHandler {
    return new ProcessCoverImageDeletingTaskHandler(
      SPANNER_DATABASE,
      S3_CLIENT,
      () => Date.now(),
    );
  }

  private static RETRY_BACKOFF_MS = 5 * 60 * 1000;
  public doneCallback: () => void = () => {};
  public interfereFn: () => Promise<void> = () => Promise.resolve();

  public constructor(
    private database: Database,
    private s3Client: S3Client,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: ProcessCoverImageDeletingTaskRequestBody,
  ): Promise<ProcessCoverImageDeletingTaskResponse> {
    loggingPrefix = `${loggingPrefix} Cover image deleting task for file ${body.r2Filename}:`;
    await this.claimTask(loggingPrefix, body.r2Filename);
    this.startProcessingAndCatchError(loggingPrefix, body.r2Filename);
    return {};
  }

  private async claimTask(
    loggingPrefix: string,
    r2Filename: string,
  ): Promise<void> {
    await this.database.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([
        updateCoverImageDeletingTaskStatement(
          r2Filename,
          this.getNow() + ProcessCoverImageDeletingTaskHandler.RETRY_BACKOFF_MS,
        ),
      ]);
      await transaction.commit();
    });
  }

  private async startProcessingAndCatchError(
    loggingPrefix: string,
    r2Filename: string,
  ): Promise<void> {
    console.log(`${loggingPrefix} Task starting.`);
    try {
      await this.startProcessing(loggingPrefix, r2Filename);
      console.log(`${loggingPrefix} Task completed!`);
    } catch (e) {
      console.error(`${loggingPrefix} Task failed! ${e.stack ?? e}`);
    }
    this.doneCallback();
  }

  private async startProcessing(
    loggingPrefix: string,
    r2Filename: string,
  ): Promise<void> {
    await this.interfereFn();
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: SEASON_COVER_IMAGE_BUCKET_NAME,
        Key: r2Filename,
      }),
    );
    await this.database.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([
        deleteCoverImageFileStatement(r2Filename),
        deleteCoverImageDeletingTaskStatement(r2Filename),
      ]);
      await transaction.commit();
    });
  }
}
