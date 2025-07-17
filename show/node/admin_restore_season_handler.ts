import { SPANNER_DATABASE } from "../../common/spanner_database";
import { getSeason, takeDownSeasonStatement } from "../../db/sql";
import { Database } from "@google-cloud/spanner";
import { AdminRestoreSeasonHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  AdminTakeDownSeasonRequestBody,
  AdminTakeDownSeasonResponse,
} from "@phading/product_service_interface/show/node/interface";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { newBadGatewayError } from "@selfage/http_error";

export class AdminRestoreSeasonHandler extends AdminRestoreSeasonHandlerInterface {
  public static create(): AdminRestoreSeasonHandler {
    return new AdminRestoreSeasonHandler(SPANNER_DATABASE);
  }

  public constructor(private database: Database) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: AdminTakeDownSeasonRequestBody,
  ): Promise<AdminTakeDownSeasonResponse> {
    await this.database.runTransactionAsync(async (transaction) => {
      let seasonRows = await getSeason(transaction, {
        seasonSeasonIdEq: body.seasonId,
      });
      if (seasonRows.length === 0) {
        throw newBadGatewayError(`Season ${body.seasonId} is not found.`);
      }
      let season = seasonRows[0];
      if (season.seasonState !== SeasonState.TAKEN_DOWN) {
        throw newBadGatewayError(
          `Season ${body.seasonId} is not in TAKEN_DOWN state.`,
        );
      }
      await transaction.batchUpdate([
        takeDownSeasonStatement({
          seasonSeasonIdEq: body.seasonId,
          setState: SeasonState.PUBLISHED,
        }),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
