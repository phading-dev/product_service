import { SEASON_COVER_IMAGE_BUCKET } from "../../../common/cloud_storage";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GetLastSeasonsRow,
  GetMoreSeasonsRow,
  getLastSeasons,
  getMoreSeasons,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { Bucket } from "@google-cloud/storage";
import { ListSeasonsHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  ListSeasonsRequestBody,
  ListSeasonsResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class ListSeasonsHandler extends ListSeasonsHandlerInterface {
  public static create(): ListSeasonsHandler {
    return new ListSeasonsHandler(
      SPANNER_DATABASE,
      SEASON_COVER_IMAGE_BUCKET,
      SERVICE_CLIENT,
    );
  }

  public constructor(
    private database: Database,
    private bucket: Bucket,
    private serviceClient: NodeServiceClient,
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
    let { userSession, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (!canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to list seasons.`,
      );
    }
    let seasonRows: Array<GetLastSeasonsRow | GetMoreSeasonsRow>;
    if (!body.lastChangeTimeCursor) {
      seasonRows = await getLastSeasons(
        (query) => this.database.run(query),
        body.state,
        userSession.accountId
      );
    } else {
      seasonRows = await getMoreSeasons(
        (query) => this.database.run(query),
        body.lastChangeTimeCursor,
        body.state,
        userSession.accountId
      );
    }
    return {
      seasons: seasonRows.map((row) => {
        return {
          seasonId: row.seasonSeasonId,
          name: row.seasonName,
          coverImageUrl: this.bucket
            .file(row.seasonCoverImageFilename)
            .publicUrl(),
          totalEpisodes: row.seasonTotalEpisodes,
          lastChangeTimestamp: row.seasonLastChangeTimestamp,
        };
      }),
      lastChangeTimeCursor:
        seasonRows.length === 0
          ? body.lastChangeTimeCursor
          : seasonRows[seasonRows.length - 1].seasonLastChangeTimestamp,
    };
  }
}
