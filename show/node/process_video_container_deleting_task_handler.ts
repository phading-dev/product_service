import { SERVICE_CLIENT } from "../../common/service_client";
import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  deleteVideoContainerDeletingTaskStatement,
  deleteVideoContainerKeyStatement,
  getVideoContainerDeletingTaskMetadata,
  updateVideoContainerDeletingTaskMetadataStatement,
} from "../../db/sql";
import { Database } from "@google-cloud/spanner";
import { ProcessVideoContainerDeletingTaskHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  ProcessVideoContainerDeletingTaskRequestBody,
  ProcessVideoContainerDeletingTaskResponse,
} from "@phading/product_service_interface/show/node/interface";
import { newDeleteVideoContainerRequest } from "@phading/video_service_interface/node/client";
import { newBadRequestError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";
import { ProcessTaskHandlerWrapper } from "@selfage/service_handler/process_task_handler_wrapper";

export class ProcessVideoContainerDeletingTaskHandler extends ProcessVideoContainerDeletingTaskHandlerInterface {
  public static create(): ProcessVideoContainerDeletingTaskHandler {
    return new ProcessVideoContainerDeletingTaskHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      () => Date.now(),
    );
  }

  private taskHandler: ProcessTaskHandlerWrapper;

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
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
    body: ProcessVideoContainerDeletingTaskRequestBody,
  ): Promise<ProcessVideoContainerDeletingTaskResponse> {
    loggingPrefix = `${loggingPrefix} Video container deleting task for video container ${body.videoContainerId}:`;
    await this.taskHandler.wrap(
      loggingPrefix,
      () => this.claimTask(loggingPrefix, body),
      () => this.processTask(loggingPrefix, body),
    );
    return {};
  }

  public async claimTask(
    loggingPrefix: string,
    body: ProcessVideoContainerDeletingTaskRequestBody,
  ): Promise<void> {
    await this.database.runTransactionAsync(async (transaction) => {
      let rows = await getVideoContainerDeletingTaskMetadata(transaction, {
        videoContainerDeletingTaskVideoContainerIdEq: body.videoContainerId,
      });
      if (rows.length === 0) {
        throw newBadRequestError("Task is not found.");
      }
      let task = rows[0];
      await transaction.batchUpdate([
        updateVideoContainerDeletingTaskMetadataStatement({
          videoContainerDeletingTaskVideoContainerIdEq: body.videoContainerId,
          setRetryCount: task.videoContainerDeletingTaskRetryCount + 1,
          setExecutionTimeMs:
            this.getNow() +
            this.taskHandler.getBackoffTime(
              task.videoContainerDeletingTaskRetryCount,
            ),
        }),
      ]);
      await transaction.commit();
    });
  }

  public async processTask(
    loggingPrefix: string,
    body: ProcessVideoContainerDeletingTaskRequestBody,
  ): Promise<void> {
    await this.serviceClient.send(
      newDeleteVideoContainerRequest({
        containerId: body.videoContainerId,
      }),
    );
    await this.database.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([
        deleteVideoContainerDeletingTaskStatement({
          videoContainerDeletingTaskVideoContainerIdEq: body.videoContainerId,
        }),
        deleteVideoContainerKeyStatement({
          videoContainerKeyKeyEq: body.videoContainerId,
        }),
      ]);
      await transaction.commit();
    });
  }
}
