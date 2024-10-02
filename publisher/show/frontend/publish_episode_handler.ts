import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteEpisodeDraftStatement,
  getEpisodeDraft,
  getSeasonMetadata,
  insertEpisodeStatement,
  updateSeasonStateStatement,
  updateSeasonTotalEpisodesStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { Statement } from "@google-cloud/spanner/build/src/transaction";
import { PublishEpisodeHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  PublishEpisodeRequestBody,
  PublishEpisodeResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { Episode } from "@phading/product_service_interface/publisher/show/frontend/season_details";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { VideoState } from "@phading/product_service_interface/publisher/show/video_state";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import {
  newBadRequestError,
  newInternalServerErrorError,
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
    let { userSession, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (!canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to publish episode.`,
      );
    }

    let episode: Episode;
    let needsRefresh = false;
    await this.database.runTransactionAsync(async (transaction) => {
      let [metadataRows, episodeDraftRows] = await Promise.all([
        getSeasonMetadata(transaction, body.seasonId, userSession.accountId),
        getEpisodeDraft(transaction, body.seasonId, body.episodeId),
      ]);
      if (metadataRows.length === 0) {
        throw newNotFoundError(`Season season1 is not found.`);
      }
      if (episodeDraftRows.length === 0) {
        throw newNotFoundError(
          `Season ${body.seasonId} episode draft ${body.episodeId} is not found.`,
        );
      }
      let totalEpisodes = metadataRows[0].seasonTotalEpisodes + 1;
      let episodeDraft = episodeDraftRows[0];
      if (episodeDraft.episodeDraftVideoState !== VideoState.UPLOADED) {
        throw newBadRequestError(
          `Video is not completely uploaded yet for season ${body.seasonId} episode draft ${body.episodeId}.`,
        );
      }
      let now = this.getNow();
      let seasonUpdateStatement: Statement;
      if (metadataRows[0].seasonState === SeasonState.DRAFT) {
        if (totalEpisodes > 1) {
          throw newInternalServerErrorError(
            `Season ${body.seasonId} is in draft state but with non-zero episodes.`,
          );
        }
        seasonUpdateStatement = updateSeasonStateStatement(
          SeasonState.PUBLISHED,
          totalEpisodes,
          now,
          body.seasonId,
        );
        needsRefresh = true;
      } else {
        seasonUpdateStatement = updateSeasonTotalEpisodesStatement(
          totalEpisodes,
          now,
          body.seasonId,
        );
      }
      let premierTimestamp = body.premierTimestamp ?? now;
      await transaction.batchUpdate([
        seasonUpdateStatement,
        insertEpisodeStatement(
          body.seasonId,
          body.episodeId,
          episodeDraft.episodeDraftName,
          totalEpisodes,
          episodeDraft.episodeDraftVideoFilename,
          episodeDraft.episodeDraftVideoLength,
          episodeDraft.episodeDraftVideoSize,
          now,
          premierTimestamp,
        ),
        deleteEpisodeDraftStatement(body.seasonId, body.episodeId),
      ]);
      episode = {
        episodeId: body.episodeId,
        name: episodeDraft.episodeDraftName,
        index: totalEpisodes,
        videoLength: episodeDraft.episodeDraftVideoLength,
        videoSize: episodeDraft.episodeDraftVideoSize,
        publishedTimestamp: now,
        premierTimestamp,
      };
      await transaction.commit();
    });
    return {
      episode,
      refreshSeason: needsRefresh,
    };
  }
}
