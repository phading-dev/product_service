import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getSeasonAndMoreForPublisher,
  updateSeasonMoreStatement,
  updateSeasonStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import {
  MAX_SEASON_DESCRIPTION_LENGTH,
  MAX_SEASON_NAME_LENGTH,
} from "@phading/constants/show";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { UpdateSeasonHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  UpdateSeasonRequestBody,
  UpdateSeasonResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class UpdateSeasonHandler extends UpdateSeasonHandlerInterface {
  public static create(): UpdateSeasonHandler {
    return new UpdateSeasonHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
      Date.now(),
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: UpdateSeasonRequestBody,
    sessionStr: string,
  ): Promise<UpdateSeasonResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.name) {
      throw newBadRequestError(`"name" is required.`);
    }
    if (body.name.length > MAX_SEASON_NAME_LENGTH) {
      throw newBadRequestError(`"name" is too long.`);
    }
    body.description ??= "";
    if (body.description.length > MAX_SEASON_DESCRIPTION_LENGTH) {
      throw newBadRequestError(`"description" is too long.`);
    }
    let { accountId, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (!canPublishShows) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to update season.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let seasonRows = await getSeasonAndMoreForPublisher(
        transaction,
        accountId,
        body.seasonId,
      );
      if (seasonRows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      let { sData, mData } = seasonRows[0];
      if (sData.state === SeasonState.ARCHIVED) {
        throw newBadRequestError(
          `Season ${body.seasonId} is archived and cannot be updated anymore.`,
        );
      }
      sData.name = body.name;
      mData.description = body.description;
      sData.lastChangeTimeMs = this.getNow();
      await transaction.batchUpdate([
        updateSeasonStatement(sData),
        updateSeasonMoreStatement(mData),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
