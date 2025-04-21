import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  ListNextPublishedEpisodesRow,
  ListPrevPublishedEpisodesRow,
  listNextPublishedEpisodes,
  listPrevPublishedEpisodes,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { MAX_NUM_OF_PUBLISHED_EPISODES_PER_SEASON } from "@phading/constants/show";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { ListEpisodesHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import { Episode } from "@phading/product_service_interface/show/web/consumer/info";
import {
  ListEpisodesRequestBody,
  ListEpisodesResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { newBadRequestError } from "@selfage/http_error";

export class ListEpisodesHandler extends ListEpisodesHandlerInterface {
  public static create(): ListEpisodesHandler {
    return new ListEpisodesHandler(SPANNER_DATABASE);
  }

  public constructor(private database: Database) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: ListEpisodesRequestBody,
  ): Promise<ListEpisodesResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!body.limit) {
      throw newBadRequestError(`"limit" is required.`);
    }
    let rows: Array<
      ListNextPublishedEpisodesRow | ListPrevPublishedEpisodesRow
    >;
    if (body.next) {
      rows = await listNextPublishedEpisodes(this.database, {
        episodeSeasonIdEq: body.seasonId,
        seasonStateEq: SeasonState.PUBLISHED,
        episodeIndexGt: body.indexCursor ?? 0,
        episodeStateEq: EpisodeState.PUBLISHED,
        limit: body.limit,
      });
    } else {
      rows = await listPrevPublishedEpisodes(this.database, {
        episodeSeasonIdEq: body.seasonId,
        seasonStateEq: SeasonState.PUBLISHED,
        episodeIndexLt:
          body.indexCursor ?? MAX_NUM_OF_PUBLISHED_EPISODES_PER_SEASON + 1,
        episodeStateEq: EpisodeState.PUBLISHED,
        limit: body.limit,
      });
    }
    return {
      episodes: rows.map(
        (row): Episode => ({
          episodeId: row.episodeEpisodeId,
          index: row.episodeIndex,
          name: row.episodeName,
          videoDurationSec: row.episodeVideoContainer.durationSec,
          resolution: row.episodeVideoContainer.resolution,
          premiereTimeMs: row.episodePremiereTimeMs,
        }),
      ),
      indexCursor:
        rows.length < body.limit
          ? undefined
          : rows[rows.length - 1].episodeIndex,
    };
  }
}
