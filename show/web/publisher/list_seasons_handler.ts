import { COVER_IMAGE_PUBLIC_ACCESS_DOMAIN } from "../../../common/env_vars";
import { MAX_LIST_SEASONS_ITEMS } from "../../../common/params";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { listSeasonsForPublisher } from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { ListSeasonsHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  ListSeasonsRequestBody,
  ListSeasonsResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/node/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class ListSeasonsHandler extends ListSeasonsHandlerInterface {
  public static create(): ListSeasonsHandler {
    return new ListSeasonsHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      COVER_IMAGE_PUBLIC_ACCESS_DOMAIN,
      () => Date.now(),
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private coverImagePublicAccessDomain: string,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: ListSeasonsRequestBody,
    sessionStr: string,
  ): Promise<ListSeasonsResponse> {
    if (!body.state) {
      throw newBadRequestError(`"state" is required.`);
    }
    if (!body.limit) {
      throw newBadRequestError(`"limit" is required.`);
    }
    if (body.limit > MAX_LIST_SEASONS_ITEMS) {
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
        `Account ${accountId} not allowed to list seasons.`,
      );
    }
    let rows = await listSeasonsForPublisher(
      this.database,
      accountId,
      body.state,
      body.lastChangeTimeCursor ?? this.getNow(),
      body.limit,
    );
    return {
      seasons: rows.map((row) => ({
        seasonId: row.seasonData.seasonId,
        name: row.seasonData.name,
        coverImageUrl: row.seasonData.coverImageR2Filename
          ? `${this.coverImagePublicAccessDomain}/${row.seasonData.coverImageR2Filename}`
          : undefined,
        totalEpisodes: row.seasonData.totalEpisodes,
        lastChangeTimeMs: row.seasonData.lastChangeTimeMs,
      })),
      lastChangeTimeCursor:
        rows.length < body.limit
          ? undefined
          : rows[rows.length - 1].seasonData.lastChangeTimeMs,
    };
  }
}
