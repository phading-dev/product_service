import { SPANNER_DATABASE } from "../../common/spanner_database";
import { getEpisode, updateEpisodeStatement } from "../../db/sql";
import { Database } from "@google-cloud/spanner";
import { CacheVideoContainerHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  CacheVideoContainerRequestBody,
  CacheVideoContainerResponse,
} from "@phading/product_service_interface/show/node/interface";
import { newBadRequestError, newNotFoundError } from "@selfage/http_error";

export class CacheVideoContainer extends CacheVideoContainerHandlerInterface {
  public static create(): CacheVideoContainer {
    return new CacheVideoContainer(SPANNER_DATABASE);
  }

  public constructor(private database: Database) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: CacheVideoContainerRequestBody,
  ): Promise<CacheVideoContainerResponse> {
    await this.database.runTransactionAsync(async (transaction) => {
      let rows = await getEpisode(transaction, body.seasonId, body.episodeId);
      if (rows.length === 0) {
        throw newNotFoundError(
          `Season ${body.seasonId} episode ${body.episodeId} is not found.`,
        );
      }
      let { episodeData } = rows[0];
      let currentVersion = episodeData.videoContainer?.version ?? 0;
      if (currentVersion > body.videoContainer.version) {
        throw newBadRequestError(
          `Season ${body.seasonId} episode ${body.episodeId} video container ${episodeData.videoContainerId} already has version ${episodeData.videoContainer.version} which is newer than the request version ${body.videoContainer.version}.`,
        );
      }
      episodeData.videoContainer = body.videoContainer;
      await transaction.batchUpdate([updateEpisodeStatement(episodeData)]);
      await transaction.commit();
    });
    return {};
  }
}
