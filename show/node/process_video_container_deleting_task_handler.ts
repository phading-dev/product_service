import { SERVICE_CLIENT } from "../../common/service_client";
import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  deleteVideoContainerDeletingTaskStatement,
  deleteVideoContainerKeyStatement,
  updateVideoContainerDeletingTaskStatement,
} from "../../db/sql";
import { Database } from "@google-cloud/spanner";
import { ProcessVideoContainerDeletingTaskHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  ProcessVideoContainerDeletingTaskRequestBody,
  ProcessVideoContainerDeletingTaskResponse,
} from "@phading/product_service_interface/show/node/interface";
import { deleteVideoContainer } from "@phading/video_service_interface/node/client";
import { NodeServiceClient } from "@selfage/node_service_client";

export class ProcessVideoContainerDeletingTaskHandler extends ProcessVideoContainerDeletingTaskHandlerInterface {
  public static create(): ProcessVideoContainerDeletingTaskHandler {
    return new ProcessVideoContainerDeletingTaskHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      () => Date.now(),
    );
  }

  private static RETRY_BACKOFF_MS = 5 * 60 * 1000;
  public doneCallback: () => void = () => {};
  public interfereFn: () => Promise<void> = () => Promise.resolve();

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: ProcessVideoContainerDeletingTaskRequestBody,
  ): Promise<ProcessVideoContainerDeletingTaskResponse> {
    loggingPrefix = `${loggingPrefix} Video container deleting task for video container ${body.videoContainerId}:`;
    await this.claimTask(loggingPrefix, body.videoContainerId);
    this.startProcessingAndCatchError(loggingPrefix, body.videoContainerId);
    return {};
  }

  private async claimTask(
    loggingPrefix: string,
    videoContainerId: string,
  ): Promise<void> {
    await this.database.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([
        updateVideoContainerDeletingTaskStatement(
          videoContainerId,
          this.getNow() +
            ProcessVideoContainerDeletingTaskHandler.RETRY_BACKOFF_MS,
        ),
      ]);
      await transaction.commit();
    });
  }

  private async startProcessingAndCatchError(
    loggingPrefix: string,
    videoContainerId: string,
  ): Promise<void> {
    console.log(`${loggingPrefix} Task starting.`);
    try {
      await this.startProcessing(loggingPrefix, videoContainerId);
      console.log(`${loggingPrefix} Task completed!`);
    } catch (e) {
      console.error(`${loggingPrefix} Task failed! ${e.stack ?? e}`);
    }
    this.doneCallback();
  }

  private async startProcessing(
    loggingPrefix: string,
    videoContainerId: string,
  ): Promise<void> {
    await this.interfereFn();
    await deleteVideoContainer(this.serviceClient, {
      containerId: videoContainerId,
    });
    await this.database.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([
        deleteVideoContainerDeletingTaskStatement(videoContainerId),
        deleteVideoContainerKeyStatement(videoContainerId),
      ]);
      await transaction.commit();
    });
  }
}
