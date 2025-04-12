import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getEpisodeForPublisher,
  updateEpisodeInfoStatement,
  updateSeasonLastChangeTimeStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { MAX_EPISODE_NAME_LENGTH } from "@phading/constants/show";
import { UpdateEpisodeHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  UpdateEpisodeRequestBody,
  UpdateEpisodeResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class UpdateEpisodeHandler extends UpdateEpisodeHandlerInterface {
  public static create(): UpdateEpisodeHandler {
    return new UpdateEpisodeHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
    body: UpdateEpisodeRequestBody,
    sessionStr: string,
  ): Promise<UpdateEpisodeResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.episodeId) {
      throw newBadRequestError(`"episodeId" is required.`);
    }
    if (!body.name) {
      throw newBadRequestError(`"name" is required.`);
    }
    if (body.name.length > MAX_EPISODE_NAME_LENGTH) {
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
        `Account ${accountId} not allowed to update episode draft.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let rows = await getEpisodeForPublisher(transaction, {
        seasonPublisherIdEq: accountId,
        episodeSeasonIdEq: body.seasonId,
        episodeEpisodeIdEq: body.episodeId,
      });
      if (rows.length === 0) {
        throw newNotFoundError(
          `Season ${body.seasonId} or episode ${body.episodeId} is not found.`,
        );
      }
      await transaction.batchUpdate([
        updateEpisodeInfoStatement({
          episodeSeasonIdEq: body.seasonId,
          episodeEpisodeIdEq: body.episodeId,
          setName: body.name,
        }),
        updateSeasonLastChangeTimeStatement({
          seasonSeasonIdEq: body.seasonId,
          setLastChangeTimeMs: this.getNow(),
        }),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
