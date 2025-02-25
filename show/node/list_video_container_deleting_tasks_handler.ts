import { SPANNER_DATABASE } from "../../common/spanner_database";
import { listPendingVideoContainerDeletingTasks } from "../../db/sql";
import { Database } from "@google-cloud/spanner";
import { ListVideoContainerDeletingTasksHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  ListVideoContainerDeletingTasksRequestBody,
  ListVideoContainerDeletingTasksResponse,
} from "@phading/product_service_interface/show/node/interface";

export class ListVideoContainerDeletingTasksHandler extends ListVideoContainerDeletingTasksHandlerInterface {
  public static create(): ListVideoContainerDeletingTasksHandler {
    return new ListVideoContainerDeletingTasksHandler(SPANNER_DATABASE, () =>
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
    body: ListVideoContainerDeletingTasksRequestBody,
  ): Promise<ListVideoContainerDeletingTasksResponse> {
    let tasks = await listPendingVideoContainerDeletingTasks(
      this.database,
      this.getNow(),
    );
    return {
      tasks: tasks.map((task) => ({
        videoContainerId: task.videoContainerDeletingTaskVideoContainerId,
      })),
    };
  }
}
