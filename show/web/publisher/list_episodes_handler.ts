import { MAX_LIST_EPISODES_ITEMS } from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  ListNextEpisodesForPublisherRow,
  ListPrevEpisodesForPublisherRow,
  listNextEpisodesForPublisher,
  listPrevEpisodesForPublisher,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { MAX_NUM_OF_EPISODES_PER_SEASON } from "@phading/constants/show";
import { EpisodeSummary } from "@phading/product_service_interface/show/web/publisher/episode_summary";
import { ListEpisodesHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  ListEpisodesRequestBody,
  ListEpisodesResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class ListEpisodesHandler extends ListEpisodesHandlerInterface {
  public static create(): ListEpisodesHandler {
    return new ListEpisodesHandler(SPANNER_DATABASE, SERVICE_CLIENT);
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: ListEpisodesRequestBody,
    sessionStr: string,
  ): Promise<ListEpisodesResponse> {
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
        `Account ${accountId} not allowed to get more episodes.`,
      );
    }
    let rows: Array<
      ListNextEpisodesForPublisherRow | ListPrevEpisodesForPublisherRow
    >;
    if (body.next) {
      rows = await listNextEpisodesForPublisher(this.database, {
        sPublisherIdEq: accountId,
        eSeasonIdEq: body.seasonId,
        eIndexGt: body.indexCursor ?? 0,
        limit: body.limit,
      });
    } else {
      rows = await listPrevEpisodesForPublisher(this.database, {
        sPublisherIdEq: accountId,
        eSeasonIdEq: body.seasonId,
        eIndexLt: body.indexCursor ?? MAX_NUM_OF_EPISODES_PER_SEASON + 1,
        limit: body.limit,
      });
    }
    return {
      episodes: rows.map(
        (row): EpisodeSummary => ({
          episodeId: row.eEpisodeId,
          name: row.eName,
          index: row.eIndex,
          videoContainer: row.eVideoContainer,
          premierTimeMs: row.ePremierTimeMs,
          publishTimeMs: row.ePublishTimeMs,
        }),
      ),
      indexCursor:
        rows.length < body.limit ? undefined : rows[rows.length - 1].eIndex,
    };
  }
}
