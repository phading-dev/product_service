import crypto = require("crypto");
import { FAR_FUTURE_TIME } from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { insertSeason, insertSeasonGrade } from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { CreateSeasonHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  CreateSeasonRequestBody,
  CreateSeasonResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class CreateSeasonHandler extends CreateSeasonHandlerInterface {
  public static create(): CreateSeasonHandler {
    return new CreateSeasonHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
      crypto.randomUUID(),
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private generateUuid: () => string,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: CreateSeasonRequestBody,
    sessionStr: string,
  ): Promise<CreateSeasonResponse> {
    if (!body.name) {
      throw newBadRequestError(`"name" is required.`);
    }
    let { userSession, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (!canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to create season.`,
      );
    }
    let seasonId = this.generateUuid();
    await this.database.runTransactionAsync(async (transaction) => {
      await insertSeason(
        (query) => transaction.run(query),
        seasonId,
        userSession.accountId,
        body.name,
        seasonId + ".jpg",
        SeasonState.DRAFT,
        0,
      );
      await insertSeasonGrade(
        (query) => transaction.run(query),
        seasonId,
        this.generateUuid(),
        1,
        new Date(0).valueOf(),
        FAR_FUTURE_TIME,
      );
      await transaction.commit();
    });
    return {
      seasonId,
    };
  }
}
