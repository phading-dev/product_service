import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { getAllEpisodes, getEpisodeAndSeason } from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { GetEpisodeToPlayHandlerInterface } from "@phading/product_service_interface/consumer/frontend/show/handler";
import {
  GetEpisodeToPlayRequestBody,
  GetEpisodeToPlayResponse,
} from "@phading/product_service_interface/consumer/frontend/show/interface";
import { getContinueTimestampForEpisode } from "@phading/user_activity_service_interface/consumer/backend/show/client";
import { getAccountSnapshot } from "@phading/user_service_interface/third_person/backend/client";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import { newBadRequestError, newForbiddenError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class GetEpisodeToPlayHandler extends GetEpisodeToPlayHandlerInterface {
  public static create(): GetEpisodeToPlayHandler {
    return new GetEpisodeToPlayHandler(SERVICE_CLIENT, SPANNER_DATABASE, () =>
      Date.now(),
    );
  }

  public constructor(
    private serviceClient: NodeServiceClient,
    private database: Database,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: GetEpisodeToPlayRequestBody,
    sessionStr: string,
  ): Promise<GetEpisodeToPlayResponse> {
    let capability = await exchangeSessionAndCheckCapability(
      this.serviceClient,
      {
        signedSession: sessionStr,
        checkCanConsumeShows: true,
      },
    );
    if (!capability.canConsumeShows) {
      throw newForbiddenError(`Not allowed to get episode.`);
    }
    let now = this.getNow();
    let [episodeAndSeasonRows, episodeRows] = await Promise.all([
      getEpisodeAndSeason(
        (query) => this.database.run(query),
        body.episodeId,
        now,
        now,
      ),
      getAllEpisodes((query) => this.database.run(query), body.episodeId, now),
    ]);
    if (episodeAndSeasonRows.length === 0) {
      throw newBadRequestError(
        `Episode ${body.episodeId} didn't find anything.`,
      );
    }

    let episodeAndSeason = episodeAndSeasonRows[0];
    let [publisherResponse, continueTimestampResponse] = await Promise.all([
      getAccountSnapshot(this.serviceClient, {
        accountId: episodeAndSeason.sPublisherId,
      }),
      getContinueTimestampForEpisode(this.serviceClient, {
        episodeId: body.episodeId,
      }),
    ]);
    return {
      episode: {
        season: {
          seasonId: episodeAndSeason.sSeasonId,
          name: episodeAndSeason.sName,
          description: episodeAndSeason.sDescription,
          coverImagePath: episodeAndSeason.sCoverImagePath,
          grade: episodeAndSeason.sgGrade,
        },
        episode: {
          episodeId: body.episodeId,
          videoPath: episodeAndSeason.eVideoPath,
          continueTimestamp: continueTimestampResponse.continueTimestamp,
        },
        publisher: {
          accountId: publisherResponse.account.accountId,
          naturalName: publisherResponse.account.naturalName,
          avatarSmallPath: publisherResponse.account.avatarSmallPath,
        },
        episodes: episodeRows.map((episode) => {
          return {
            episodeId: episode.esEpisodeId,
            name: episode.esName,
            videoLength: episode.esVideoLength,
            publishedTime: Math.floor(
              episode.esScheduledPublishTimestamp / 1000,
            ),
          };
        }),
      },
    };
  }
}
