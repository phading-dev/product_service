import { SERVICE_CLIENT } from "../../common/service_client";
import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  deleteVideoContainerCreatingTaskStatement,
  deleteVideoContainerDeletingTaskStatement,
  getEpisode,
  insertVideoContainerDeletingTaskStatement,
  insertVideoContainerKeyStatement,
  updateEpisodeStatement,
  updateVideoContainerCreatingTaskStatement,
  updateVideoContainerDeletingTaskStatement,
} from "../../db/sql";
import { Database } from "@google-cloud/spanner";
import { ProcessVideoContainerCreatingTaskHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  ProcessVideoContainerCreatingTaskRequestBody,
  ProcessVideoContainerCreatingTaskResponse,
} from "@phading/product_service_interface/show/node/interface";
import { createVideoContainer } from "@phading/video_service_interface/node/client";
import { newConflictError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class ProcessVideoContainerCreatingTaskHandler extends ProcessVideoContainerCreatingTaskHandlerInterface {
  public static create(): ProcessVideoContainerCreatingTaskHandler {
    return new ProcessVideoContainerCreatingTaskHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      () => crypto.randomUUID(),
      () => Date.now(),
    );
  }

  private static RETRY_BACKOFF_MS = 5 * 60 * 1000;
  private static CLEAN_UP_ON_ERROR_DELAY_MS = 3 * 60 * 1000;
  private static ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
  public doneCallback: () => void = () => {};
  public interfereFn: () => Promise<void> = () => Promise.resolve();

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private generateUuid: () => string,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: ProcessVideoContainerCreatingTaskRequestBody,
  ): Promise<ProcessVideoContainerCreatingTaskResponse> {
    loggingPrefix = `${loggingPrefix} Video container creating task for season ${body.seasonId} epsiode ${body.episodeId}:`;
    await this.claimTask(loggingPrefix, body.seasonId, body.episodeId);
    this.startProcessingAndCatchError(
      loggingPrefix,
      body.seasonId,
      body.episodeId,
    );
    return {};
  }

  private async claimTask(
    loggingPrefix: string,
    seasonId: string,
    episodeId: string,
  ): Promise<void> {
    await this.database.runTransactionAsync(async (transaction) => {
      let rows = await getEpisode(transaction, seasonId, episodeId);
      if (rows.length === 0) {
        throw newConflictError(
          `Season ${seasonId} Episode ${episodeId} is not found.`,
        );
      }
      await transaction.batchUpdate([
        updateVideoContainerCreatingTaskStatement(
          seasonId,
          episodeId,
          this.getNow() +
            ProcessVideoContainerCreatingTaskHandler.RETRY_BACKOFF_MS,
        ),
      ]);
      await transaction.commit();
    });
  }

  private async startProcessingAndCatchError(
    loggingPrefix: string,
    seasonId: string,
    episodeId: string,
  ): Promise<void> {
    console.log(`${loggingPrefix} Task starting.`);
    try {
      await this.startProcessing(loggingPrefix, seasonId, episodeId);
      console.log(`${loggingPrefix} Task completed!`);
    } catch (e) {
      console.error(`${loggingPrefix} Task failed! ${e.stack ?? e}`);
    }
    this.doneCallback();
  }

  private async startProcessing(
    loggingPrefix: string,
    seasonId: string,
    episodeId: string,
  ): Promise<void> {
    let videoContainerId = `show${this.generateUuid()}`;
    await this.database.runTransactionAsync(async (transaction) => {
      let now = this.getNow();
      await transaction.batchUpdate([
        insertVideoContainerKeyStatement(videoContainerId),
        insertVideoContainerDeletingTaskStatement(
          videoContainerId,
          now + ProcessVideoContainerCreatingTaskHandler.ONE_YEAR_MS,
          now,
        ),
      ]);
      await transaction.commit();
    });

    try {
      await this.interfereFn();
      await createVideoContainer(this.serviceClient, {
        seasonId,
        episodeId,
        videoContainerId,
      });
      await this.database.runTransactionAsync(async (transaction) => {
        let rows = await getEpisode(transaction, seasonId, episodeId);
        if (rows.length === 0) {
          throw newConflictError(
            `Season ${seasonId} Episode ${episodeId} is not found.`,
          );
        }
        let { episodeData } = rows[0];
        episodeData.videoContainerId = videoContainerId;
        await transaction.batchUpdate([
          updateEpisodeStatement(episodeData),
          deleteVideoContainerDeletingTaskStatement(videoContainerId),
          deleteVideoContainerCreatingTaskStatement(seasonId, episodeId),
        ]);
        await transaction.commit();
      });
    } catch (e) {
      await this.database.runTransactionAsync(async (transaction) => {
        await transaction.batchUpdate([
          updateVideoContainerDeletingTaskStatement(
            videoContainerId,
            this.getNow() +
              ProcessVideoContainerCreatingTaskHandler.CLEAN_UP_ON_ERROR_DELAY_MS,
          ),
        ]);
        await transaction.commit();
      });
      throw e;
    }
  }
}
