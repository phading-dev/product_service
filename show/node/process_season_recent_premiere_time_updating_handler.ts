import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  deleteSeasonRecentPremiereTimeUpdatingTaskStatement,
  getSeasonRecentPremiereTime,
  getSeasonRecentPremiereTimeUpdatingTaskMetadata,
  listRecentEpisodesByPremiereTime,
  updateSeasonRecentPremiereTimeStatement,
  updateSeasonRecentPremiereTimeUpdatingTaskMetadataStatement,
} from "../../db/sql";
import { Database } from "@google-cloud/spanner";
import { ProcessSeasonRecentPremiereTimeUpdatingTaskHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  ProcessSeasonRecentPremiereTimeUpdatingTaskRequestBody,
  ProcessSeasonRecentPremiereTimeUpdatingTaskResponse,
} from "@phading/product_service_interface/show/node/interface";
import {
  newBadRequestError,
  newInternalServerErrorError,
} from "@selfage/http_error";
import { ProcessTaskHandlerWrapper } from "@selfage/service_handler/process_task_handler_wrapper";

export class ProcessSeasonRecentPremiereTimeUpdatingTaskHandler extends ProcessSeasonRecentPremiereTimeUpdatingTaskHandlerInterface {
  public static create(): ProcessSeasonRecentPremiereTimeUpdatingTaskHandler {
    return new ProcessSeasonRecentPremiereTimeUpdatingTaskHandler(
      SPANNER_DATABASE,
      () => Date.now(),
    );
  }

  private taskHandler = ProcessTaskHandlerWrapper.create(
    this.descriptor,
    5 * 60 * 1000,
    24 * 60 * 60 * 1000,
  );

  public constructor(
    private database: Database,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: ProcessSeasonRecentPremiereTimeUpdatingTaskRequestBody,
  ): Promise<ProcessSeasonRecentPremiereTimeUpdatingTaskResponse> {
    loggingPrefix = `${loggingPrefix} Season recent premier time updating task for season ${body.seasonId} episode ${body.episodeId}:`;
    await this.taskHandler.wrap(
      loggingPrefix,
      () => this.claimTask(loggingPrefix, body),
      () => this.processTask(loggingPrefix, body),
    );
    return {};
  }

  public async claimTask(
    loggingPrefix: string,
    body: ProcessSeasonRecentPremiereTimeUpdatingTaskRequestBody,
  ): Promise<void> {
    await this.database.runTransactionAsync(async (transaction) => {
      let rows = await getSeasonRecentPremiereTimeUpdatingTaskMetadata(
        transaction,
        {
          seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: body.seasonId,
          seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: body.episodeId,
        },
      );
      if (rows.length === 0) {
        throw newBadRequestError("Task is not found.");
      }
      let task = rows[0];
      await transaction.batchUpdate([
        updateSeasonRecentPremiereTimeUpdatingTaskMetadataStatement({
          seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: body.seasonId,
          seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: body.episodeId,
          setRetryCount:
            task.seasonRecentPremiereTimeUpdatingTaskRetryCount + 1,
          setExecutionTimeMs:
            this.getNow() +
            this.taskHandler.getBackoffTime(
              task.seasonRecentPremiereTimeUpdatingTaskRetryCount,
            ),
        }),
      ]);
      await transaction.commit();
    });
  }

  public async processTask(
    loggingPrefix: string,
    body: ProcessSeasonRecentPremiereTimeUpdatingTaskRequestBody,
  ): Promise<void> {
    await this.database.runTransactionAsync(async (transaction) => {
      let now = this.getNow();
      let [recentEpisodes, seasonRows] = await Promise.all([
        listRecentEpisodesByPremiereTime(transaction, {
          episodeSeasonIdEq: body.seasonId,
          episodePremiereTimeMsLt: now,
          limit: 1,
        }),
        getSeasonRecentPremiereTime(transaction, {
          seasonSeasonIdEq: body.seasonId,
        }),
      ]);
      if (recentEpisodes.length === 0) {
        throw newInternalServerErrorError(
          `Season ${body.seasonId} has no premier episodes found at ${now}.`,
        );
      }
      if (seasonRows.length === 0) {
        throw newInternalServerErrorError(
          `Season ${body.seasonId} is not found.`,
        );
      }
      let episode = recentEpisodes[0];
      let season = seasonRows[0];
      await transaction.batchUpdate([
        ...(season.seasonRecentPremiereTimeMs !== episode.episodePremiereTimeMs
          ? [
              updateSeasonRecentPremiereTimeStatement({
                seasonSeasonIdEq: body.seasonId,
                setRecentPremiereTimeMs: episode.episodePremiereTimeMs,
              }),
            ]
          : []),
        deleteSeasonRecentPremiereTimeUpdatingTaskStatement({
          seasonRecentPremiereTimeUpdatingTaskSeasonIdEq: body.seasonId,
          seasonRecentPremiereTimeUpdatingTaskEpisodeIdEq: body.episodeId,
        }),
      ]);
      await transaction.commit();
    });
  }
}
