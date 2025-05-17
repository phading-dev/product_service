import { MAX_LIST_EPISODES_ITEMS } from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  ListNextPublishedEpisodesForPublisherRow,
  ListPrevPublishedEpisodesForPublisherRow,
  listNextPublishedEpisodesForPublisher,
  listPrevPublishedEpisodesForPublisher,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { MAX_NUM_OF_PUBLISHED_EPISODES_PER_SEASON } from "@phading/constants/show";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { ListPublishedEpisodesHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  ListPublishedEpisodesRequestBody,
  ListPublishedEpisodesResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { EpisodeSummary } from "@phading/product_service_interface/show/web/publisher/summary";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class ListPublishedEpisodesHandler extends ListPublishedEpisodesHandlerInterface {
  public static create(): ListPublishedEpisodesHandler {
    return new ListPublishedEpisodesHandler(SPANNER_DATABASE, SERVICE_CLIENT);
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: ListPublishedEpisodesRequestBody,
    sessionStr: string,
  ): Promise<ListPublishedEpisodesResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.limit) {
      throw newBadRequestError(`"limit" is required.`);
    }
    if (body.limit > MAX_LIST_EPISODES_ITEMS) {
      throw newBadRequestError(`"limit" is too large.`);
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
        `Account ${accountId} is not allowed to get more episodes.`,
      );
    }
    let rows: Array<
      | ListNextPublishedEpisodesForPublisherRow
      | ListPrevPublishedEpisodesForPublisherRow
    >;
    if (body.next) {
      rows = await listNextPublishedEpisodesForPublisher(this.database, {
        seasonPublisherIdEq: accountId,
        episodeSeasonIdEq: body.seasonId,
        episodeStateEq: EpisodeState.PUBLISHED,
        episodeIndexGt: body.indexCursor ?? 0,
        limit: body.limit,
      });
    } else {
      rows = await listPrevPublishedEpisodesForPublisher(this.database, {
        seasonPublisherIdEq: accountId,
        episodeSeasonIdEq: body.seasonId,
        episodeStateEq: EpisodeState.PUBLISHED,
        episodeIndexLt:
          body.indexCursor ?? MAX_NUM_OF_PUBLISHED_EPISODES_PER_SEASON + 1,
        limit: body.limit,
      });
    }
    return {
      episodes: rows.map(
        (row): EpisodeSummary => ({
          episodeId: row.episodeEpisodeId,
          state: row.episodeState,
          name: row.episodeName,
          index: row.episodeIndex,
          videoContainer: row.episodeVideoContainerCached,
          premiereTimeMs: row.episodePremiereTimeMs,
        }),
      ),
      indexCursor:
        rows.length < body.limit
          ? undefined
          : rows[rows.length - 1].episodeIndex,
    };
  }
}
