import { SPANNER_DATABASE } from "../../common/spanner_database";
import { getEpisode, updateEpisodeVideoContainerStatement } from "../../db/sql";
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
      let rows = await getEpisode(transaction, {
        episodeSeasonIdEq: body.seasonId,
        episodeEpisodeIdEq: body.episodeId,
      });
      if (rows.length === 0) {
        throw newNotFoundError(
          `Season ${body.seasonId} episode ${body.episodeId} is not found.`,
        );
      }
      let row = rows[0];
      let currentVersion = row.episodeVideoContainer?.version ?? 0;
      if (currentVersion > body.videoContainer.version) {
        throw newBadRequestError(
          `Season ${body.seasonId} episode ${body.episodeId} video container already has version ${row.episodeVideoContainer.version} which is newer than the request version ${body.videoContainer.version}.`,
        );
      }
      await transaction.batchUpdate([
        updateEpisodeVideoContainerStatement({
          episodeSeasonIdEq: body.seasonId,
          episodeEpisodeIdEq: body.episodeId,
          setVideoContainer: body.videoContainer,
        }),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
