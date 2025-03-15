import { SPANNER_DATABASE } from "../../common/spanner_database";
import { getSeasonPublisher } from "../../db/sql";
import { Database } from "@google-cloud/spanner";
import { GetSeasonPublisherHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  GetSeasonPublisherRequestBody,
  GetSeasonPublisherResponse,
} from "@phading/product_service_interface/show/node/interface";
import { newNotFoundError } from "@selfage/http_error";

export class GetSeasonPublisherHandler extends GetSeasonPublisherHandlerInterface {
  public static create(): GetSeasonPublisherHandler {
    return new GetSeasonPublisherHandler(SPANNER_DATABASE);
  }

  public constructor(private database: Database) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: GetSeasonPublisherRequestBody,
  ): Promise<GetSeasonPublisherResponse> {
    let seasonRows = await getSeasonPublisher(this.database, {
      seasonSeasonIdEq: body.seasonId,
    });
    if (seasonRows.length === 0) {
      throw newNotFoundError(`Season ${body.seasonId} not found.`);
    }
    return {
      publisherId: seasonRows[0].seasonPublisherId,
    };
  }
}
