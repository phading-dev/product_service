import { SERVICE_CLIENT } from "../../common/service_client";
import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  deleteVideoContainerCreatingTaskStatement,
  deleteVideoContainerDeletingTaskStatement,
  getEpisode,
  getSeasonAndEpisode,
  getVideoContainerCreatingTaskMetadata,
  insertVideoContainerDeletingTaskStatement,
  insertVideoContainerKeyStatement,
  updateEpisodeVideoContainerIdStatement,
  updateVideoContainerCreatingTaskMetadataStatement,
  updateVideoContainerDeletingTaskMetadataStatement,
} from "../../db/sql";
import { Database } from "@google-cloud/spanner";
import { ProcessVideoContainerCreatingTaskHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  ProcessVideoContainerCreatingTaskRequestBody,
  ProcessVideoContainerCreatingTaskResponse,
} from "@phading/product_service_interface/show/node/interface";
import { newCreateVideoContainerRequest } from "@phading/video_service_interface/node/client";
import { newBadRequestError, newConflictError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";
import { ProcessTaskHandlerWrapper } from "@selfage/service_handler/process_task_handler_wrapper";

export class ProcessVideoContainerCreatingTaskHandler extends ProcessVideoContainerCreatingTaskHandlerInterface {
  public static create(): ProcessVideoContainerCreatingTaskHandler {
    return new ProcessVideoContainerCreatingTaskHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      () => crypto.randomUUID(),
      () => Date.now(),
    );
  }

  private static CLEAN_UP_ON_ERROR_DELAY_MS = 5 * 60 * 1000;
  private static ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
  private taskHandler: ProcessTaskHandlerWrapper;

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private generateUuid: () => string,
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
    body: ProcessVideoContainerCreatingTaskRequestBody,
  ): Promise<ProcessVideoContainerCreatingTaskResponse> {
    loggingPrefix = `${loggingPrefix} Video container creating task for season ${body.seasonId} epsiode ${body.episodeId}:`;
    await this.taskHandler.wrap(
      loggingPrefix,
      () => this.claimTask(loggingPrefix, body),
      () => this.processTask(loggingPrefix, body),
    );
    return {};
  }

  public async claimTask(
    loggingPrefix: string,
    body: ProcessVideoContainerCreatingTaskRequestBody,
  ): Promise<void> {
    await this.database.runTransactionAsync(async (transaction) => {
      let rows = await getVideoContainerCreatingTaskMetadata(transaction, {
        videoContainerCreatingTaskSeasonIdEq: body.seasonId,
        videoContainerCreatingTaskEpisodeIdEq: body.episodeId,
      });
      if (rows.length === 0) {
        throw newBadRequestError(`Task is not found.`);
      }
      let task = rows[0];
      await transaction.batchUpdate([
        updateVideoContainerCreatingTaskMetadataStatement({
          videoContainerCreatingTaskSeasonIdEq: body.seasonId,
          videoContainerCreatingTaskEpisodeIdEq: body.episodeId,
          setRetryCount: task.videoContainerCreatingTaskRetryCount + 1,
          setExecutionTimeMs:
            this.getNow() +
            this.taskHandler.getBackoffTime(
              task.videoContainerCreatingTaskRetryCount,
            ),
        }),
      ]);
      await transaction.commit();
    });
  }

  public async processTask(
    loggingPrefix: string,
    body: ProcessVideoContainerCreatingTaskRequestBody,
  ): Promise<void> {
    let videoContainerId = `show${this.generateUuid()}`;
    let accountId: string;
    await this.database.runTransactionAsync(async (transaction) => {
      let rows = await getSeasonAndEpisode(transaction, {
        episodeSeasonIdEq: body.seasonId,
        episodeEpisodeIdEq: body.episodeId,
      });
      if (rows.length === 0) {
        throw newBadRequestError(
          `Season ${body.seasonId} or episode ${body.episodeId} is not found.`,
        );
      }
      let row = rows[0];
      if (row.episodeVideoContainerId) {
        throw newConflictError(
          `Video container for season ${body.seasonId} episode ${body.episodeId} is already created.`,
        );
      }
      accountId = row.seasonPublisherId;

      let now = this.getNow();
      await transaction.batchUpdate([
        insertVideoContainerKeyStatement({
          key: videoContainerId,
        }),
        insertVideoContainerDeletingTaskStatement({
          videoContainerId,
          retryCount: 0,
          executionTimeMs:
            now + ProcessVideoContainerCreatingTaskHandler.ONE_YEAR_MS,
          createdTimeMs: now,
        }),
      ]);
      await transaction.commit();
    });

    try {
      await this.serviceClient.send(
        newCreateVideoContainerRequest({
          seasonId: body.seasonId,
          episodeId: body.episodeId,
          accountId,
          videoContainerId,
        }),
      );
      await this.database.runTransactionAsync(async (transaction) => {
        let rows = await getEpisode(transaction, {
          episodeSeasonIdEq: body.seasonId,
          episodeEpisodeIdEq: body.episodeId,
        });
        if (rows.length === 0) {
          throw newBadRequestError(
            `Season ${body.seasonId} or episode ${body.episodeId} is not found.`,
          );
        }
        let row = rows[0];
        if (row.episodeVideoContainerId) {
          throw newConflictError(
            `Video container for season ${body.seasonId} episode ${body.episodeId} is already created.`,
          );
        }

        await transaction.batchUpdate([
          updateEpisodeVideoContainerIdStatement({
            episodeSeasonIdEq: body.seasonId,
            episodeEpisodeIdEq: body.episodeId,
            setVideoContainerId: videoContainerId,
          }),
          deleteVideoContainerDeletingTaskStatement({
            videoContainerDeletingTaskVideoContainerIdEq: videoContainerId,
          }),
          deleteVideoContainerCreatingTaskStatement({
            videoContainerCreatingTaskSeasonIdEq: body.seasonId,
            videoContainerCreatingTaskEpisodeIdEq: body.episodeId,
          }),
        ]);
        await transaction.commit();
      });
    } catch (e) {
      await this.database.runTransactionAsync(async (transaction) => {
        await transaction.batchUpdate([
          updateVideoContainerDeletingTaskMetadataStatement({
            videoContainerDeletingTaskVideoContainerIdEq: videoContainerId,
            setRetryCount: 0,
            setExecutionTimeMs:
              this.getNow() +
              ProcessVideoContainerCreatingTaskHandler.CLEAN_UP_ON_ERROR_DELAY_MS,
          }),
        ]);
        await transaction.commit();
      });
      throw e;
    }
  }
}
