import { SPANNER_DATABASE } from "../../common/spanner_database";
import { listPendingVideoContainerCreatingTasks } from "../../db/sql";
import { Database } from "@google-cloud/spanner";
import { ListVideoContainerCreatingTasksHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  ListVideoContainerCreatingTasksRequestBody,
  ListVideoContainerCreatingTasksResponse,
} from "@phading/product_service_interface/show/node/interface";

export class ListVideoContainerCreatingTasksHandler extends ListVideoContainerCreatingTasksHandlerInterface {
  public static create(): ListVideoContainerCreatingTasksHandler {
    return new ListVideoContainerCreatingTasksHandler(SPANNER_DATABASE, () =>
      Date.now(),
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
    body: ListVideoContainerCreatingTasksRequestBody,
  ): Promise<ListVideoContainerCreatingTasksResponse> {
    let tasks = await listPendingVideoContainerCreatingTasks(
      this.database,
      this.getNow(),
    );
    return {
      tasks: tasks.map((task) => ({
        seasonId: task.videoContainerCreatingTaskSeasonId,
        episodeId: task.videoContainerCreatingTaskEpisodeId,
      })),
    };
  }
}
