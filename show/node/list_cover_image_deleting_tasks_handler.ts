import { SPANNER_DATABASE } from "../../common/spanner_database";
import { listPendingCoverImageDeletingTasks } from "../../db/sql";
import { Database } from "@google-cloud/spanner";
import { ListCoverImageDeletingTasksHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  ListCoverImageDeletingTasksRequestBody,
  ListCoverImageDeletingTasksResponse,
} from "@phading/product_service_interface/show/node/interface";

export class ListCoverImageDeletingTasksHandler extends ListCoverImageDeletingTasksHandlerInterface {
  public static create(): ListCoverImageDeletingTasksHandler {
    return new ListCoverImageDeletingTasksHandler(SPANNER_DATABASE, () =>
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
    body: ListCoverImageDeletingTasksRequestBody,
  ): Promise<ListCoverImageDeletingTasksResponse> {
    let tasks = await listPendingCoverImageDeletingTasks(this.database, {
      coverImageDeletingTaskExecutionTimeMsLe: this.getNow()
  });
    return {
      tasks: tasks.map((task) => ({
        r2Filename: task.coverImageDeletingTaskR2Filename,
      })),
    };
  }
}
