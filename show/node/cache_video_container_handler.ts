import { SPANNER_DATABASE } from "../../common/spanner_database";
import { getEpisode, updateEpisodeVideoContainerCachedStatement } from "../../db/sql";
import { Database } from "@google-cloud/spanner";
import { CacheVideoContainerHandlerInterface } from "@phading/product_service_interface/show/node/handler";
import {
  CacheVideoContainerRequestBody,
  CacheVideoContainerResponse,
} from "@phading/product_service_interface/show/node/interface";
import { newBadRequestError, newNotFoundError } from "@selfage/http_error";

export class CacheVideoContainerHandler extends CacheVideoContainerHandlerInterface {
  public static create(): CacheVideoContainerHandler {
    return new CacheVideoContainerHandler(SPANNER_DATABASE);
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
      let currentVersion = row.episodeVideoContainerCached?.version ?? 0;
      if (currentVersion > body.videoContainerCached.version) {
        throw newBadRequestError(
          `Season ${body.seasonId} episode ${body.episodeId} video container already has version ${row.episodeVideoContainerCached.version} which is newer than the request version ${body.videoContainerCached.version}.`,
        );
      }
      await transaction.batchUpdate([
        updateEpisodeVideoContainerCachedStatement({
          episodeSeasonIdEq: body.seasonId,
          episodeEpisodeIdEq: body.episodeId,
          setVideoContainerCached: body.videoContainerCached,
        }),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
