import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { getSeasonName } from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { GetSeasonNameHandlerInterface } from "@phading/product_service_interface/show/web/public/handler";
import {
  GetSeasonNameRequestBody,
  GetSeasonNameResponse,
} from "@phading/product_service_interface/show/web/public/interface";

export class GetSeasonNameHandler extends GetSeasonNameHandlerInterface {
  public static create(): GetSeasonNameHandler {
    return new GetSeasonNameHandler(SPANNER_DATABASE);
  }

  public constructor(private readonly spannerDatabase: Database) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: GetSeasonNameRequestBody,
  ): Promise<GetSeasonNameResponse> {
    if (!body.seasonId) {
      throw new Error(`"seasonId" is required`);
    }
    let rows = await getSeasonName(this.spannerDatabase, {
      seasonSeasonIdEq: body.seasonId,
    });
    if (rows.length === 0) {
      throw new Error(`Season ${body.seasonId} is not found.`);
    }
    return {
      name: rows[0].seasonName,
    };
  }
}
