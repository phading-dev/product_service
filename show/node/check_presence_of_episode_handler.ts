import { SPANNER_DATABASE } from "../../common/spanner_database";
import { checkPresenceOfEpisode } from "../../db/sql";
import { Database } from "@google-cloud/spanner";
import { CheckPresenceOfEpisodeHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  CheckPresenceOfEpisodeRequestBody,
  CheckPresenceOfEpisodeResponse,
} from "@phading/product_service_interface/show/node/interface";

export class CheckPresenceOfEpisodeHandler extends CheckPresenceOfEpisodeHandlerInterface {
  public static create(): CheckPresenceOfEpisodeHandler {
    return new CheckPresenceOfEpisodeHandler(SPANNER_DATABASE);
  }

  public constructor(private database: Database) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: CheckPresenceOfEpisodeRequestBody,
  ): Promise<CheckPresenceOfEpisodeResponse> {
    let rows = await checkPresenceOfEpisode(this.database, {
      episodeSeasonIdEq: body.seasonId,
      episodeEpisodeIdEq: body.episodeId,
    });
    return {
      present: rows.length > 0,
    };
  }
}
