import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getSeasonAndEpisodeForPublisher,
  listNextPublishedEpisodesForPublisher,
  publishEpisodeStatement,
  updateEpisodeIndexStatement,
  updateSeasonTotalPublishedEpisodesStatement,
} from "../../../db/sql";
import { updateSeasonRecentPremiereTime } from "./common/update_season_recent_premiere_time";
import { Database } from "@google-cloud/spanner";
import { MAX_NUM_OF_PUBLISHED_EPISODES_PER_SEASON } from "@phading/constants/show";
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
      let rows = await getSeasonAndEpisodeForPublisher(transaction, {
        seasonPublisherIdEq: accountId,
        episodeSeasonIdEq: body.seasonId,
        episodeEpisodeIdEq: body.episodeId,
      });
      if (rows.length === 0) {
        throw newNotFoundError(
          `Season ${body.seasonId} or episode ${body.episodeId} is not found.`,
        );
      }
      let row = rows[0];
      if (row.episodeState !== EpisodeState.PUBLISHED) {
        throw newBadRequestError(
          `Season ${body.seasonId} episode ${body.episodeId} is not published.`,
        );
      }
      if (row.seasonTotalPublishedEpisodes <= 1) {
        throw newBadRequestError(
          `Season ${body.seasonId} episode ${body.episodeId} is the last published episode.`,
        );
      }
      let nextEpisodes = await listNextPublishedEpisodesForPublisher(
        transaction,
        {
          episodeSeasonIdEq: body.seasonId,
          seasonPublisherIdEq: accountId,
          episodeStateEq: EpisodeState.PUBLISHED,
          episodeIndexGt: row.episodeIndex,
          limit: MAX_NUM_OF_PUBLISHED_EPISODES_PER_SEASON,
        },
      );
      let now = this.getNow();
      await transaction.batchUpdate([
        updateSeasonTotalPublishedEpisodesStatement({
          seasonSeasonIdEq: body.seasonId,
          setTotalPublishedEpisodes: row.seasonTotalPublishedEpisodes - 1,
          setLastChangeTimeMs: now,
        }),
        publishEpisodeStatement({
          episodeSeasonIdEq: body.seasonId,
          episodeEpisodeIdEq: body.episodeId,
          setState: EpisodeState.DRAFT,
          setIndex: undefined,
          setPremiereTimeMs: undefined,
        }),
        ...nextEpisodes.map((episode) =>
          updateEpisodeIndexStatement({
            episodeSeasonIdEq: episode.episodeSeasonId,
            episodeEpisodeIdEq: episode.episodeEpisodeId,
            setIndex: episode.episodeIndex - 1,
          }),
        ),
      ]);
      await updateSeasonRecentPremiereTime(
        transaction,
        body.seasonId,
        body.episodeId,
        now,
      );
      await transaction.commit();
    });
    return {};
  }
}
