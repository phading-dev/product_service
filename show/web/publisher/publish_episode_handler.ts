import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getSeasonAndEpisodeForPublisher,
  updateEpisodeStatement,
  updateSeasonStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { PublishEpisodeHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  PublishEpisodeRequestBody,
  PublishEpisodeResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class PublishEpisodeHandler extends PublishEpisodeHandlerInterface {
  public static create(): PublishEpisodeHandler {
    return new PublishEpisodeHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
    body: PublishEpisodeRequestBody,
    sessionStr: string,
  ): Promise<PublishEpisodeResponse> {
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
        `Account ${accountId} not allowed to publish episode.`,
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
      if (!eData.videoContainer) {
        throw newBadRequestError(
          `Video container is not committed yet for season ${body.seasonId} episode ${body.episodeId}.`,
        );
      }
      let now = this.getNow();
      eData.publishTimeMs = now;
      eData.premierTimeMs = body.premierTimeMs ?? now;
      if (sData.state === SeasonState.DRAFT) {
        sData.state = SeasonState.PUBLISHED;
      }
      sData.lastChangeTimeMs = now;
      await transaction.batchUpdate([
        updateEpisodeStatement(eData),
        updateSeasonStatement(sData),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
