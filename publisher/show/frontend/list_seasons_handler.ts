import { STORAGE_CLIENT } from "../../../common/cloud_storage";
import { SEASON_COVER_IMAGE_BUCKET_NAME } from "../../../common/env_variables";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GetLastSeasonsRow,
  GetMoreSeasonsRow,
  getLastSeasons,
  getMoreSeasons,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { Storage } from "@google-cloud/storage";
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
      STORAGE_CLIENT,
      SERVICE_CLIENT,
    );
  }

  public constructor(
    private database: Database,
    private storage: Storage,
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
        this.database,
        body.state,
        userSession.accountId,
      );
    } else {
      seasonRows = await getMoreSeasons(
        this.database,
        body.lastChangeTimeCursor,
        body.state,
        userSession.accountId,
      );
    }
    return {
      seasons: seasonRows.map((row) => {
        return {
          seasonId: row.seasonSeasonId,
          name: row.seasonName,
          coverImageUrl: this.storage
            .bucket(SEASON_COVER_IMAGE_BUCKET_NAME)
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
