import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getEpisodeForPublisher,
  updateEpisodePremiereTimeStatement,
  updateSeasonLastChangeTimeStatement,
} from "../../../db/sql";
import { updateSeasonRecentPremiereTime } from "./common/update_season_recent_premiere_time";
import { Database } from "@google-cloud/spanner";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { UpdateEpisodePremiereTimeHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  UpdateEpisodePremiereTimeRequestBody,
  UpdateEpisodePremiereTimeResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import { newBadRequestError, newNotFoundError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class UpdateEpisodePremiereTimeHandler extends UpdateEpisodePremiereTimeHandlerInterface {
  public static create(): UpdateEpisodePremiereTimeHandler {
    return new UpdateEpisodePremiereTimeHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      () => Date.now(),
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
    body: UpdateEpisodePremiereTimeRequestBody,
    authStr: string,
  ): Promise<UpdateEpisodePremiereTimeResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.episodeId) {
      throw newBadRequestError(`"episodeId" is required.`);
    }
    if (!body.premiereTimeMs) {
      throw newBadRequestError(`"premiereTimeMs" is required.`);
    }
    let { accountId, capabilities } = await this.serviceClient.send(
      newFetchSessionAndCheckCapabilityRequest({
        signedSession: authStr,
        capabilitiesMask: {
          checkCanPublish: true,
        },
      }),
    );
    if (!capabilities.canPublish) {
      throw newUnauthorizedError(
        `Account ${accountId} is not allowed to update episode premiere time.`,
      );
    }
    await this.database.runTransactionAsync(async (transaction) => {
      let episodeRows = await getEpisodeForPublisher(transaction, {
        episodeSeasonIdEq: body.seasonId,
        seasonPublisherIdEq: accountId,
        episodeEpisodeIdEq: body.episodeId,
      });
      if (episodeRows.length === 0) {
        throw newNotFoundError(
          `Season ${body.seasonId} episode ${body.episodeId} is not found.`,
        );
      }
      let episodeRow = episodeRows[0];
      if (episodeRow.episodeState !== EpisodeState.PUBLISHED) {
        throw newBadRequestError(
          `Season ${body.seasonId} episode ${body.episodeId} is not in published state.`,
        );
      }
      let now = this.getNow();
      await transaction.batchUpdate([
        updateEpisodePremiereTimeStatement({
          episodeSeasonIdEq: body.seasonId,
          episodeEpisodeIdEq: body.episodeId,
          setPremiereTimeMs: body.premiereTimeMs,
        }),
        updateSeasonLastChangeTimeStatement({
          seasonSeasonIdEq: body.seasonId,
          setLastChangeTimeMs: now,
        }),
      ]);
      await updateSeasonRecentPremiereTime(
        transaction,
        body.seasonId,
        body.episodeId,
        now,
        body.premiereTimeMs,
      );
      await transaction.commit();
    });
    return {};
  }
}
