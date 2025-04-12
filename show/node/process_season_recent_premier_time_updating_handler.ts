import { SPANNER_DATABASE } from "../../common/spanner_database";
import {
  deleteSeasonRecentPremierTimeUpdatingTaskStatement,
  getSeasonRecentPremierTime,
  getSeasonRecentPremierTimeUpdatingTaskMetadata,
  listRecentEpisodesByPremierTime,
  updateSeasonRecentPremierTimeStatement,
  updateSeasonRecentPremierTimeUpdatingTaskMetadataStatement,
} from "../../db/sql";
import { Database } from "@google-cloud/spanner";
import { ProcessSeasonRecentPremierTimeUpdatingTaskHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  ProcessSeasonRecentPremierTimeUpdatingTaskRequestBody,
  ProcessSeasonRecentPremierTimeUpdatingTaskResponse,
} from "@phading/product_service_interface/show/node/interface";
import {
  newBadRequestError,
  newInternalServerErrorError,
} from "@selfage/http_error";
import { ProcessTaskHandlerWrapper } from "@selfage/service_handler/process_task_handler_wrapper";

export class ProcessSeasonRecentPremierTimeUpdatingTaskHandler extends ProcessSeasonRecentPremierTimeUpdatingTaskHandlerInterface {
  public static create(): ProcessSeasonRecentPremierTimeUpdatingTaskHandler {
    return new ProcessSeasonRecentPremierTimeUpdatingTaskHandler(
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
    body: ProcessSeasonRecentPremierTimeUpdatingTaskRequestBody,
  ): Promise<ProcessSeasonRecentPremierTimeUpdatingTaskResponse> {
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
    body: ProcessSeasonRecentPremierTimeUpdatingTaskRequestBody,
  ): Promise<void> {
    await this.database.runTransactionAsync(async (transaction) => {
      let rows = await getSeasonRecentPremierTimeUpdatingTaskMetadata(
        transaction,
        {
          seasonRecentPremierTimeUpdatingTaskSeasonIdEq: body.seasonId,
          seasonRecentPremierTimeUpdatingTaskEpisodeIdEq: body.episodeId,
        },
      );
      if (rows.length === 0) {
        throw newBadRequestError("Task is not found.");
      }
      let task = rows[0];
      await transaction.batchUpdate([
        updateSeasonRecentPremierTimeUpdatingTaskMetadataStatement({
          seasonRecentPremierTimeUpdatingTaskSeasonIdEq: body.seasonId,
          seasonRecentPremierTimeUpdatingTaskEpisodeIdEq: body.episodeId,
          setRetryCount: task.seasonRecentPremierTimeUpdatingTaskRetryCount + 1,
          setExecutionTimeMs:
            this.getNow() +
            this.taskHandler.getBackoffTime(
              task.seasonRecentPremierTimeUpdatingTaskRetryCount,
            ),
        }),
      ]);
      await transaction.commit();
    });
  }

  public async processTask(
    loggingPrefix: string,
    body: ProcessSeasonRecentPremierTimeUpdatingTaskRequestBody,
  ): Promise<void> {
    await this.database.runTransactionAsync(async (transaction) => {
      let now = this.getNow();
      let [recentEpisodes, seasonRows] = await Promise.all([
        listRecentEpisodesByPremierTime(transaction, {
          episodeSeasonIdEq: body.seasonId,
          episodePremierTimeMsLt: now,
          limit: 1,
        }),
        getSeasonRecentPremierTime(transaction, {
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
        ...(season.seasonRecentPremierTimeMs !== episode.episodePremierTimeMs
          ? [
              updateSeasonRecentPremierTimeStatement({
                seasonSeasonIdEq: body.seasonId,
                setRecentPremierTimeMs: episode.episodePremierTimeMs,
              }),
            ]
          : []),
        deleteSeasonRecentPremierTimeUpdatingTaskStatement({
          seasonRecentPremierTimeUpdatingTaskSeasonIdEq: body.seasonId,
          seasonRecentPremierTimeUpdatingTaskEpisodeIdEq: body.episodeId,
        }),
      ]);
      await transaction.commit();
    });
  }
}
