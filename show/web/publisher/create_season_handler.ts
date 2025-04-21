import crypto = require("crypto");
import { FAR_FUTURE_DATE, FAR_PAST_DATE } from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  insertSeasonGradeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { MAX_SEASON_NAME_LENGTH } from "@phading/constants/show";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { CreateSeasonHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  CreateSeasonRequestBody,
  CreateSeasonResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class CreateSeasonHandler extends CreateSeasonHandlerInterface {
  public static create(): CreateSeasonHandler {
    return new CreateSeasonHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      () => Date.now(),
      () => crypto.randomUUID(),
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private getNow: () => number,
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
    if (body.name.length > MAX_SEASON_NAME_LENGTH) {
      throw newBadRequestError(`"name" is too long.`);
    }
    let { accountId, capabilities } = await this.serviceClient.send(
      newFetchSessionAndCheckCapabilityRequest({
        signedSession: sessionStr,
        capabilitiesMask: {
          checkCanPublish: true,
        },
      }),
    );
    if (!capabilities.canPublish) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to create season.`,
      );
    }
    let seasonId: string;
    await this.database.runTransactionAsync(async (transaction) => {
      let now = this.getNow();
      seasonId = this.generateUuid();
      await transaction.batchUpdate([
        insertSeasonStatement({
          seasonId,
          publisherId: accountId,
          state: SeasonState.DRAFT,
          name: body.name,
          totalPublishedEpisodes: 0,
          lastChangeTimeMs: now,
          description: "",
          createdTimeMs: now,
          totalRatings: 0,
          ratingsCount: 0,
          averageRating: 0,
          ratingUpdatedTimeMs: now,
        }),
        insertSeasonGradeStatement({
          seasonId,
          gradeId: this.generateUuid(),
          startDate: FAR_PAST_DATE,
          endDate: FAR_FUTURE_DATE,
          grade: 1,
        }),
      ]);
      await transaction.commit();
    });
    return {
      seasonId,
    };
  }
}
