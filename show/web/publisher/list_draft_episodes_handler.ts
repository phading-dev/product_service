import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { listDraftEpisodesForPublisher } from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { EpisodeState } from "@phading/product_service_interface/show/episode_state";
import { ListDraftEpisodesHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  ListDraftEpisodesRequestBody,
  ListDraftEpisodesResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { EpisodeSummary } from "@phading/product_service_interface/show/web/publisher/summary";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class ListDraftEpisodesHandler extends ListDraftEpisodesHandlerInterface {
  public static create(): ListDraftEpisodesHandler {
    return new ListDraftEpisodesHandler(SPANNER_DATABASE, SERVICE_CLIENT);
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: ListDraftEpisodesRequestBody,
    sessionStr: string,
  ): Promise<ListDraftEpisodesResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
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
        `Account ${accountId} is not allowed to list draft episodes.`,
      );
    }
    let rows = await listDraftEpisodesForPublisher(this.database, {
      episodeSeasonIdEq: body.seasonId,
      episodeStateEq: EpisodeState.DRAFT,
      seasonPublisherIdEq: accountId,
    });
    return {
      episodes: rows.map(
        (row): EpisodeSummary => ({
          episodeId: row.episodeEpisodeId,
          state: row.episodeState,
          name: row.episodeName,
          index: row.episodeIndex,
          videoContainer: row.episodeVideoContainer,
          premiereTimeMs: row.episodePremiereTimeMs,
        }),
      ),
    };
  }
}
