import { MAX_NUM_OF_PUBLISHED_EPISODES_PER_SEASON } from "@phading/constants/show";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getSeasonAndEpisodeForPublisher,
  publishEpisodeStatement,
  publishSeasonStatement,
  updateSeasonTotalPublishedEpisodesStatement,
} from "../../../db/sql";
import { updateSeasonRecentPremiereTime } from "./common/update_season_recent_premiere_time";
import { Database } from "@google-cloud/spanner";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { PublishEpisodeHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  PublishEpisodeRequestBody,
  PublishEpisodeResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
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
        `Account ${accountId} not allowed to publish episode.`,
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
      if (row.episodeState !== EpisodeState.DRAFT) {
        throw newBadRequestError(
          `Season ${body.seasonId} episode ${body.episodeId} is not in DRAFT state.`,
        );
      }
      if (row.seasonTotalPublishedEpisodes >= MAX_NUM_OF_PUBLISHED_EPISODES_PER_SEASON) {
        throw newBadRequestError(
          `Season ${body.seasonId} has reached maximum number of published episodes.`,
        );
      }
      if (!row.episodeVideoContainerCached) {
        throw newBadRequestError(
          `Video container is not committed yet for season ${body.seasonId} episode ${body.episodeId}.`,
        );
      }
      let now = this.getNow();
      let premiereTimeMs = body.premiereTimeMs ?? now;
      let totalPublishedEpisodes = row.seasonTotalPublishedEpisodes + 1;
      await transaction.batchUpdate([
        ...(row.seasonState === SeasonState.DRAFT
          ? [
              publishSeasonStatement({
                seasonSeasonIdEq: body.seasonId,
                setState: SeasonState.PUBLISHED,
                setTotalPublishedEpisodes: totalPublishedEpisodes,
                setLastChangeTimeMs: now,
                setPublishedTimeMs: now,
              }),
            ]
          : [
              updateSeasonTotalPublishedEpisodesStatement({
                seasonSeasonIdEq: body.seasonId,
                setTotalPublishedEpisodes: totalPublishedEpisodes,
                setLastChangeTimeMs: now,
              }),
            ]),
        publishEpisodeStatement({
          episodeSeasonIdEq: body.seasonId,
          episodeEpisodeIdEq: body.episodeId,
          setState: EpisodeState.PUBLISHED,
          setIndex: totalPublishedEpisodes,
          setPremiereTimeMs: premiereTimeMs,
        }),
      ]);
      await updateSeasonRecentPremiereTime(
        transaction,
        body.seasonId,
        body.episodeId,
        now,
        premiereTimeMs,
      );
      await transaction.commit();
    });
    return {};
  }
}
