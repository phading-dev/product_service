import { SENDGRID_CLIENT } from "../../../common/sendgrid_client";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { insertSeasonFlagReportStatement } from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { SeasonFlagReason } from "@phading/product_service_interface/show/season_flag_reason";
import { FlagSeasonHandlerInterface } from "@phading/product_service_interface/show/web/public/handler";
import {
  FlagSeasonRequestBody,
  FlagSeasonResponse,
} from "@phading/product_service_interface/show/web/public/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import { newBadRequestError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class FlagSeasonHandler extends FlagSeasonHandlerInterface {
  public static create(): FlagSeasonHandler {
    return new FlagSeasonHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      SENDGRID_CLIENT,
      () => Date.now(),
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private sendgridClient: any,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: FlagSeasonRequestBody,
    authStr: string,
  ): Promise<FlagSeasonResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required`);
    }
    if (!body.reason) {
      throw newBadRequestError(`"reason" is required`);
    }
    body.comment ??= "";
    let { accountId } = await this.serviceClient.send(
      newFetchSessionAndCheckCapabilityRequest({
        signedSession: authStr,
      }),
    );
    await this.database.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([
        insertSeasonFlagReportStatement({
          reporterId: accountId,
          seasonId: body.seasonId,
          reason: body.reason,
          comment: body.comment,
          flagTimeMs: this.getNow(),
        }),
      ]);
      await transaction.commit();
    });
    this.sendgridClient.send({
      to: ENV_VARS.supportEmail,
      from: ENV_VARS.supportEmail,
      subject: "New Season Flag Report",
      text: `Season ${body.seasonId} has been flagged for the following reason: ${SeasonFlagReason[body.reason]}. Comment: ${body.comment}`,
    });
    return {};
  }
}
