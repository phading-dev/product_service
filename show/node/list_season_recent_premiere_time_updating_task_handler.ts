import { SPANNER_DATABASE } from "../../common/spanner_database";
import { listPendingSeasonRecentPremiereTimeUpdatingTasks } from "../../db/sql";
import { Database } from "@google-cloud/spanner";
import { ListSeasonRecentPremiereTimeUpdatingTasksHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  ListSeasonRecentPremiereTimeUpdatingTasksRequestBody,
  ListSeasonRecentPremiereTimeUpdatingTasksResponse,
  ProcessSeasonRecentPremiereTimeUpdatingTaskRequestBody,
} from "@phading/product_service_interface/show/node/interface";

export class ListSeasonRecentPremiereTimeUpdatingTaskHandler extends ListSeasonRecentPremiereTimeUpdatingTasksHandlerInterface {
  public static create(): ListSeasonRecentPremiereTimeUpdatingTaskHandler {
    return new ListSeasonRecentPremiereTimeUpdatingTaskHandler(
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
    body: ListSeasonRecentPremiereTimeUpdatingTasksRequestBody,
  ): Promise<ListSeasonRecentPremiereTimeUpdatingTasksResponse> {
    let tasks = await listPendingSeasonRecentPremiereTimeUpdatingTasks(
      this.database,
      {
        seasonRecentPremiereTimeUpdatingTaskExecutionTimeMsLe: this.getNow(),
      },
    );
    return {
      tasks: tasks.map(
        (task): ProcessSeasonRecentPremiereTimeUpdatingTaskRequestBody => ({
          seasonId: task.seasonRecentPremiereTimeUpdatingTaskSeasonId,
          episodeId: task.seasonRecentPremiereTimeUpdatingTaskEpisodeId,
        }),
      ),
    };
  }
}
