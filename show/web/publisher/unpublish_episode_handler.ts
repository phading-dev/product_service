import { FAR_FUTURE_TIME_MS } from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonRecentPremierTimeUpdatingTaskStatement,
  getEpisodeForPublisher,
  listRecentEpisodesByPremierTime,
  publishEpisodeStatement,
  updateSeasonLastChangeTimeStatement,
  updateSeasonRecentPremierTimeStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { UnpublishEpisodeHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  UnpublishEpisodeRequestBody,
  UnpublishEpisodeResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
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
        `Account ${accountId} not allowed to unpublish episode.`,
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
      let episode = rows[0];
      if (episode.episodeState !== EpisodeState.PUBLISHED) {
        throw newBadRequestError(`Episode ${body.episodeId} is not published.`);
      }
      let now = this.getNow();
      await transaction.batchUpdate([
        updateSeasonLastChangeTimeStatement({
          seasonSeasonIdEq: body.seasonId,
          setLastChangeTimeMs: now,
        }),
        publishEpisodeStatement({
          episodeSeasonIdEq: body.seasonId,
          episodeEpisodeIdEq: body.episodeId,
          setState: EpisodeState.DRAFT,
          setPremierTimeMs: FAR_FUTURE_TIME_MS,
        }),
        deleteSeasonRecentPremierTimeUpdatingTaskStatement({
          seasonRecentPremierTimeUpdatingTaskSeasonIdEq: body.seasonId,
          seasonRecentPremierTimeUpdatingTaskEpisodeIdEq: body.episodeId,
        }),
      ]);

      let recentEpisodes = await listRecentEpisodesByPremierTime(transaction, {
        episodeSeasonIdEq: body.seasonId,
        episodePremierTimeMsLt: now,
        limit: 1,
      });
      await transaction.batchUpdate([
        updateSeasonRecentPremierTimeStatement({
          seasonSeasonIdEq: body.seasonId,
          setRecentPremierTimeMs:
            recentEpisodes.length > 0
              ? recentEpisodes[0].episodePremierTimeMs
              : FAR_FUTURE_TIME_MS,
        }),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
