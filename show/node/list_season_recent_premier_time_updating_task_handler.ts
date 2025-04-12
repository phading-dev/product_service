import { SPANNER_DATABASE } from "../../common/spanner_database";
import { listPendingSeasonRecentPremierTimeUpdatingTasks } from "../../db/sql";
import { Database } from "@google-cloud/spanner";
import { ListSeasonRecentPremierTimeUpdatingTasksHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  ListSeasonRecentPremierTimeUpdatingTasksRequestBody,
  ListSeasonRecentPremierTimeUpdatingTasksResponse,
  ProcessSeasonRecentPremierTimeUpdatingTaskRequestBody,
} from "@phading/product_service_interface/show/node/interface";

export class ListSeasonRecentPremierTimeUpdatingTaskHandler extends ListSeasonRecentPremierTimeUpdatingTasksHandlerInterface {
  public static create(): ListSeasonRecentPremierTimeUpdatingTaskHandler {
    return new ListSeasonRecentPremierTimeUpdatingTaskHandler(
      SPANNER_DATABASE,
      () => Date.now(),
    );
  }

  public constructor(
    private database: Database,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: ListSeasonRecentPremierTimeUpdatingTasksRequestBody,
  ): Promise<ListSeasonRecentPremierTimeUpdatingTasksResponse> {
    let tasks = await listPendingSeasonRecentPremierTimeUpdatingTasks(
      this.database,
      {
        seasonRecentPremierTimeUpdatingTaskExecutionTimeMsLe: this.getNow(),
      },
    );
    return {
      tasks: tasks.map(
        (task): ProcessSeasonRecentPremierTimeUpdatingTaskRequestBody => ({
          seasonId: task.seasonRecentPremierTimeUpdatingTaskSeasonId,
          episodeId: task.seasonRecentPremierTimeUpdatingTaskEpisodeId,
        }),
      ),
    };
  }
}
