import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { getPublishedEpisode } from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { GetEpisodeHandlerInterface } from "@phading/product_service_interface/show/web/public/handler";
import {
  GetEpisodeRequestBody,
  GetEpisodeResponse,
} from "@phading/product_service_interface/show/web/public/interface";
import { newBadRequestError, newNotFoundError } from "@selfage/http_error";

export class GetEpisodeHandler extends GetEpisodeHandlerInterface {
  public static create(): GetEpisodeHandler {
    return new GetEpisodeHandler(SPANNER_DATABASE, () => Date.now());
  }

  public constructor(
    private database: Database,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: GetEpisodeRequestBody,
  ): Promise<GetEpisodeResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.episodeId) {
      throw newBadRequestError(`"episodeId" is required.`);
    }
    let rows = await getPublishedEpisode(this.database, {
      episodeSeasonIdEq: body.seasonId,
      seasonStateEq: SeasonState.PUBLISHED,
      episodeEpisodeIdEq: body.episodeId,
      episodeStateEq: EpisodeState.PUBLISHED,
    });
    if (rows.length === 0) {
      throw newNotFoundError(
        `Season ${body.seasonId} episode ${body.episodeId} is not found.`,
      );
    }
    let row = rows[0];
    return {
      episode: {
        episodeId: row.episodeEpisodeId,
        name: row.episodeName,
        index: row.episodeIndex,
        resolution: row.episodeVideoContainerCached.resolution,
        videoDurationSec: row.episodeVideoContainerCached.durationSec,
        premiereTimeMs: row.episodePremiereTimeMs,
        canPlay: row.episodePremiereTimeMs <= this.getNow(),
      },
    };
  }
}
