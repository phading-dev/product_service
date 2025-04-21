import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteEpisodeStatement,
  deleteVideoContainerCreatingTaskStatement,
  getSeasonAndEpisodeForPublisher,
  insertVideoContainerDeletingTaskStatement,
  listNextPublishedEpisodesForPublisher,
  updateEpisodeIndexStatement,
  updateSeasonLastChangeTimeStatement,
  updateSeasonTotalPublishedEpisodesStatement,
} from "../../../db/sql";
import { updateSeasonRecentPremiereTime } from "./common/update_season_recent_premiere_time";
import { Database } from "@google-cloud/spanner";
import { Statement } from "@google-cloud/spanner/build/src/transaction";
import { MAX_NUM_OF_PUBLISHED_EPISODES_PER_SEASON } from "@phading/constants/show";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { DeleteEpisodeHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  DeleteEpisodeRequestBody,
  DeleteEpisodeResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class DeleteEpisodeHandler extends DeleteEpisodeHandlerInterface {
  public static create(): DeleteEpisodeHandler {
    return new DeleteEpisodeHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
    body: DeleteEpisodeRequestBody,
    sessionStr: string,
  ): Promise<DeleteEpisodeResponse> {
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
        `Account ${accountId} not allowed to delete episode.`,
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
      let seasonAndEpisode = rows[0];
      let now = this.getNow();
      let statements: Array<Statement> = [
        deleteEpisodeStatement({
          episodeSeasonIdEq: body.seasonId,
          episodeEpisodeIdEq: body.episodeId,
        }),
      ];
      if (seasonAndEpisode.episodeVideoContainerId) {
        statements.push(
          insertVideoContainerDeletingTaskStatement({
            videoContainerId: seasonAndEpisode.episodeVideoContainerId,
            retryCount: 0,
            executionTimeMs: now,
            createdTimeMs: now,
          }),
        );
      } else {
        statements.push(
          deleteVideoContainerCreatingTaskStatement({
            videoContainerCreatingTaskSeasonIdEq: body.seasonId,
            videoContainerCreatingTaskEpisodeIdEq: body.episodeId,
          }),
        );
      }

      if (seasonAndEpisode.episodeState === EpisodeState.DRAFT) {
        statements.push(
          updateSeasonLastChangeTimeStatement({
            seasonSeasonIdEq: body.seasonId,
            setLastChangeTimeMs: now,
          }),
        );
      } else {
        statements.push(
          updateSeasonTotalPublishedEpisodesStatement({
            seasonSeasonIdEq: body.seasonId,
            setTotalPublishedEpisodes:
              seasonAndEpisode.seasonTotalPublishedEpisodes - 1,
            setLastChangeTimeMs: now,
          }),
        );
        let nextEpisodes = await listNextPublishedEpisodesForPublisher(
          transaction,
          {
            episodeSeasonIdEq: body.seasonId,
            seasonPublisherIdEq: accountId,
            episodeStateEq: EpisodeState.PUBLISHED,
            episodeIndexGt: seasonAndEpisode.episodeIndex,
            limit: MAX_NUM_OF_PUBLISHED_EPISODES_PER_SEASON,
          },
        );
        for (let episode of nextEpisodes) {
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

      if (seasonAndEpisode.episodeState === EpisodeState.PUBLISHED) {
        await updateSeasonRecentPremiereTime(
          transaction,
          body.seasonId,
          body.episodeId,
          now,
        );
      }
      await transaction.commit();
    });
    return {};
  }
}
