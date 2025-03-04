import { SPANNER_DATABASE } from "../../common/spanner_database";
import { checkPresenceOfSeason } from "../../db/sql";
import { Database } from "@google-cloud/spanner";
import { CheckPresenceOfSeasonHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  CheckPresenceOfSeasonRequestBody,
  CheckPresenceOfSeasonResponse,
} from "@phading/product_service_interface/show/node/interface";

export class CheckPresenceOfSeasonHandler extends CheckPresenceOfSeasonHandlerInterface {
  public static create(): CheckPresenceOfSeasonHandler {
    return new CheckPresenceOfSeasonHandler(SPANNER_DATABASE);
  }

  public constructor(private database: Database) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: CheckPresenceOfSeasonRequestBody,
  ): Promise<CheckPresenceOfSeasonResponse> {
    let rows = await checkPresenceOfSeason(this.database, body.seasonId);
    return {
      present: rows.length > 0,
    };
  }
}
