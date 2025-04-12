import { MAX_LIST_SEASONS_ITEMS } from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { listSeasonsForPublisher } from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { ListSeasonsHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  ListSeasonsRequestBody,
  ListSeasonsResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { SeasonSummary } from "@phading/product_service_interface/show/web/publisher/summary";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class ListSeasonsHandler extends ListSeasonsHandlerInterface {
  public static create(): ListSeasonsHandler {
    return new ListSeasonsHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      ENV_VARS.r2SeasonCoverImagePublicAccessDomain,
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
        `Account ${accountId} not allowed to list seasons.`,
      );
    }
    let rows = await listSeasonsForPublisher(this.database, {
      seasonPublisherIdEq: accountId,
      seasonStateEq: body.state,
      seasonLastChangeTimeMsLt: body.lastChangeTimeCursor ?? this.getNow(),
      limit: body.limit,
    });
    return {
      seasons: rows.map(
        (row): SeasonSummary => ({
          seasonId: row.seasonSeasonId,
          name: row.seasonName,
          coverImageUrl: row.seasonCoverImageR2Filename
            ? `${this.coverImagePublicAccessDomain}/${row.seasonCoverImageR2Filename}`
            : undefined,
          totalEpisodes: row.seasonTotalEpisodes,
          lastChangeTimeMs: row.seasonLastChangeTimeMs,
          averageRating: row.seasonAverageRating,
        }),
      ),
      lastChangeTimeCursor:
        rows.length < body.limit
          ? undefined
          : rows[rows.length - 1].seasonLastChangeTimeMs,
    };
  }
}
