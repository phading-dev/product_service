import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getSeasonAndEpisodeForPublisher,
  listNextPublishedEpisodesForPublisher,
  listPrevPublishedEpisodesForPublisher,
  updateEpisodeIndexStatement,
  updateSeasonLastChangeTimeStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { Statement } from "@google-cloud/spanner/build/src/transaction";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { UpdateEpisodeIndexHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  UpdateEpisodeIndexRequestBody,
  UpdateEpisodeIndexResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class UpdateEpisodeIndexHandler extends UpdateEpisodeIndexHandlerInterface {
  public static create(): UpdateEpisodeIndexHandler {
    return new UpdateEpisodeIndexHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
    body: UpdateEpisodeIndexRequestBody,
    sessionStr: string,
  ): Promise<UpdateEpisodeIndexResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.episodeId) {
      throw newBadRequestError(`"episodeId" is required.`);
    }
    if (body.toIndex == null) {
      throw newBadRequestError(`"toIndex" is required.`);
    }
    if (body.toIndex < 1) {
      throw newBadRequestError(`"toIndex" must be positive.`);
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
        `Account ${accountId} is not allowed to update episode order.`,
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
          `Season ${body.seasonId} episode ${body.episodeId} is not in PUBLISHED state.`,
        );
      }
      if (body.toIndex > row.seasonTotalPublishedEpisodes) {
        throw newBadRequestError(
          `Season ${body.seasonId} episode ${body.episodeId}'s target index ${body.toIndex} is larger than the total number of published episodes which is ${row.seasonTotalPublishedEpisodes}.`,
        );
      }
      let currentIndex = row.episodeIndex;
      if (body.toIndex === currentIndex) {
        throw newBadRequestError(
          `Season ${body.seasonId} episode ${body.episodeId} is already at index ${body.toIndex}.`,
        );
      }
      let statements: Array<Statement> = [
        updateEpisodeIndexStatement({
          episodeSeasonIdEq: body.seasonId,
          episodeEpisodeIdEq: body.episodeId,
          setIndex: body.toIndex,
        }),
        updateSeasonLastChangeTimeStatement({
          seasonSeasonIdEq: body.seasonId,
          setLastChangeTimeMs: this.getNow(),
        }),
      ];
      if (body.toIndex < currentIndex) {
        let episodes = await listPrevPublishedEpisodesForPublisher(transaction, {
          seasonPublisherIdEq: accountId,
          episodeSeasonIdEq: body.seasonId,
          episodeStateEq: EpisodeState.PUBLISHED,
          episodeIndexLt: currentIndex,
          limit: currentIndex - body.toIndex,
        });
        for (let episode of episodes) {
          statements.push(
            updateEpisodeIndexStatement({
              episodeSeasonIdEq: episode.episodeSeasonId,
              episodeEpisodeIdEq: episode.episodeEpisodeId,
              setIndex: episode.episodeIndex + 1,
            }),
          );
        }
      } else {
        // toIndex > currentIndex
        let episodes = await listNextPublishedEpisodesForPublisher(transaction, {
          seasonPublisherIdEq: accountId,
          episodeSeasonIdEq: body.seasonId,
          episodeStateEq: EpisodeState.PUBLISHED,
          episodeIndexGt: currentIndex,
          limit: body.toIndex - currentIndex,
        });
        for (let episode of episodes) {
          statements.push(
            updateEpisodeIndexStatement({
              episodeSeasonIdEq: episode.episodeSeasonId,
              episodeEpisodeIdEq: episode.episodeEpisodeId,
              setIndex: episode.episodeIndex - 1,
            }),
          );
        }
      }
      await transaction.batchUpdate(statements);
      await transaction.commit();
    });
    return {};
  }
}
