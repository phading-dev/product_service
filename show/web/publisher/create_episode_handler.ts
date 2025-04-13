import crypto = require("crypto");
import { FAR_FUTURE_TIME_MS } from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getSeasonForPublisher,
  insertEpisodeStatement,
  insertVideoContainerCreatingTaskStatement,
  updateSeasonTotalEpisodesStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import {
  MAX_EPISODE_NAME_LENGTH,
  MAX_NUM_OF_EPISODES_PER_SEASON,
} from "@phading/constants/show";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { CreateEpisodeHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  CreateEpisodeRequestBody,
  CreateEpisodeResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class CreateEpisodeHandler extends CreateEpisodeHandlerInterface {
  public static create(): CreateEpisodeHandler {
    return new CreateEpisodeHandler(
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
    body: CreateEpisodeRequestBody,
    sessionStr: string,
  ): Promise<CreateEpisodeResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.episodeName) {
      throw newBadRequestError(`"episodeName" is required.`);
    }
    if (body.episodeName.length > MAX_EPISODE_NAME_LENGTH) {
      throw newBadRequestError(`"episodeName" is too long.`);
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
        `Account ${accountId} not allowed to create episode draft.`,
      );
    }
    let episodeId: string;
    let index: number;
    await this.database.runTransactionAsync(async (transaction) => {
      let rows = await getSeasonForPublisher(transaction, {
        seasonPublisherIdEq: accountId,
        seasonSeasonIdEq: body.seasonId,
      });
      if (rows.length === 0) {
        throw newNotFoundError(`Season ${body.seasonId} is not found.`);
      }
      let season = rows[0];
      if (season.seasonState === SeasonState.ARCHIVED) {
        throw newBadRequestError(
          `Season ${body.seasonId} is archived and cannot create new episode.`,
        );
      }
      if (season.seasonTotalEpisodes >= MAX_NUM_OF_EPISODES_PER_SEASON) {
        throw newBadRequestError(
          `Season ${body.seasonId} already has maximum number of episodes.`,
        );
      }
      let now = this.getNow();
      episodeId = this.generateUuid();
      let totalEpisodes = season.seasonTotalEpisodes + 1;
      index = totalEpisodes;
      await transaction.batchUpdate([
        updateSeasonTotalEpisodesStatement({
          seasonSeasonIdEq: body.seasonId,
          setTotalEpisodes: totalEpisodes,
          setLastChangeTimeMs: now,
        }),
        insertEpisodeStatement({
          seasonId: body.seasonId,
          episodeId,
          index,
          name: body.episodeName,
          state: EpisodeState.DRAFT,
          premiereTimeMs: FAR_FUTURE_TIME_MS,
        }),
        insertVideoContainerCreatingTaskStatement({
          seasonId: body.seasonId,
          episodeId,
          retryCount: 0,
          executionTimeMs: now,
          createdTimeMs: now,
        }),
      ]);
      await transaction.commit();
    });
    return {
      episode: {
        episodeId,
        name: body.episodeName,
        index,
        state: EpisodeState.DRAFT,
        premiereTimeMs: FAR_FUTURE_TIME_MS,
      },
    };
  }
}
