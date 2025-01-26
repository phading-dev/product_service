import { FAR_FUTURE_TIME_MS } from "../../../common/params";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getSeasonAndEpisodeForPublisher,
  updateEpisodeStatement,
  updateSeasonStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { UnpublishEpisodeHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  UnpublishEpisodeRequestBody,
  UnpublishEpisodeResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class UnpublishEpisodeHandler extends UnpublishEpisodeHandlerInterface {
  public static create(): UnpublishEpisodeHandler {
    return new UnpublishEpisodeHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
    body: UnpublishEpisodeRequestBody,
    sessionStr: string,
  ): Promise<UnpublishEpisodeResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.episodeId) {
      throw newBadRequestError(`"episodeId" is required.`);
    }
    let { accountId, capabilities } = await exchangeSessionAndCheckCapability(
      this.serviceClient,
      {
        signedSession: sessionStr,
        capabilitiesMask: {
          checkCanPublishShows: true,
        },
      },
    );
    if (!capabilities.canPublishShows) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to unpublish episode.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let rows = await getSeasonAndEpisodeForPublisher(
        transaction,
        accountId,
        body.seasonId,
        body.episodeId,
      );
      if (rows.length === 0) {
        throw newNotFoundError(
          `Season ${body.seasonId} or episode ${body.episodeId} is not found.`,
        );
      }
      let { sData, eData } = rows[0];
      eData.publishTimeMs = FAR_FUTURE_TIME_MS;
      eData.premierTimeMs = FAR_FUTURE_TIME_MS;
      sData.lastChangeTimeMs = this.getNow();
      await transaction.batchUpdate([
        updateEpisodeStatement(eData),
        updateSeasonStatement(sData),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
