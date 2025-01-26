import { MAX_LIST_EPISODES_ITEMS } from "../../../common/params";
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
import { ListEpisodesHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  ListEpisodesRequestBody,
  ListEpisodesResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/node/client";
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
    let { accountId, capabilities } = await exchangeSessionAndCheckCapability(
      this.serviceClient,
      {
        signedSession: sessionStr,
        capabilitiesMask: {
          checkCanPublishShows: true,
        },
      },
    );
    if (!capabilities.canPublishShows) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to get more episodes.`,
      );
    }
    let rows: Array<
      ListNextEpisodesForPublisherRow | ListPrevEpisodesForPublisherRow
    >;
    if (body.next) {
      rows = await listNextEpisodesForPublisher(
        this.database,
        accountId,
        body.seasonId,
        body.indexCursor ?? 0,
        body.limit,
      );
    } else {
      rows = await listPrevEpisodesForPublisher(
        this.database,
        accountId,
        body.seasonId,
        body.indexCursor ?? MAX_NUM_OF_EPISODES_PER_SEASON + 1,
        body.limit,
      );
    }
    return {
      episodes: rows.map((row) => ({
        episodeId: row.eData.episodeId,
        name: row.eData.name,
        index: row.eData.index,
        videoContainer: row.eData.videoContainer,
        premierTimeMs: row.eData.premierTimeMs,
        publishTimeMs: row.eData.publishTimeMs,
      })),
      indexCursor:
        rows.length < body.limit
          ? undefined
          : rows[rows.length - 1].eData.index,
    };
  }
}
