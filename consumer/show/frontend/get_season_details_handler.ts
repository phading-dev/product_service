import { SEASON_COVER_IMAGE_BUCKET } from "../../../common/cloud_storage";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getEpisodeForConsumer,
  getEpisodeForConsumerByIndex,
  getSeasonForConsumer,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { Bucket } from "@google-cloud/storage";
import { GetSeasonDetailsHandlerInterface } from "@phading/product_service_interface/consumer/show/frontend/handler";
import {
  GetSeasonDetailsRequestBody,
  GetSeasonDetailsResponse,
} from "@phading/product_service_interface/consumer/show/frontend/interface";
import { SeasonDetails } from "@phading/product_service_interface/consumer/show/frontend/season_details";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { getContinueEpisode } from "@phading/user_activity_service_interface/consumer/show/backend/client";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class GetSeasonDetailsHandler extends GetSeasonDetailsHandlerInterface {
  public static create(): GetSeasonDetailsHandler {
    return new GetSeasonDetailsHandler(
      SPANNER_DATABASE,
      SEASON_COVER_IMAGE_BUCKET,
      SERVICE_CLIENT,
      () => Date.now(),
    );
  }

  public constructor(
    private database: Database,
    private bucket: Bucket,
    private serviceClient: NodeServiceClient,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: GetSeasonDetailsRequestBody,
    sessionStr: string,
  ): Promise<GetSeasonDetailsResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    let { userSession, canConsumeShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanConsumeShows: true,
      });
    if (!canConsumeShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to get season details.`,
      );
    }
    let seasonDetails: SeasonDetails = {};
    await Promise.all([
      this.getSeasonDetails(body, seasonDetails),
      this.getContinueEpisodeDetails(body, seasonDetails),
    ]);
    return {
      seasonDetails,
    };
  }

  private async getSeasonDetails(
    body: GetSeasonDetailsRequestBody,
    seasonDetails: SeasonDetails,
  ): Promise<void> {
    let now = this.getNow();
    let seasonRows = await getSeasonForConsumer(
      (query) => this.database.run(query),
      body.seasonId,
      SeasonState.PUBLISHED,
      now,
      now,
    );
    if (seasonRows.length === 0) {
      throw newNotFoundError(`Season ${body.seasonId} is not found.`);
    }
    seasonDetails.seasonId = body.seasonId;
    seasonDetails.name = seasonRows[0].sName;
    seasonDetails.description = seasonRows[0].sDescription;
    seasonDetails.coverImageUrl = this.bucket
      .file(seasonRows[0].sCoverImageFilename)
      .publicUrl();
    seasonDetails.grade = seasonRows[0].sgGrade;
    seasonDetails.totalEpisodes = seasonRows[0].sTotalEpisodes;
  }

  private async getContinueEpisodeDetails(
    body: GetSeasonDetailsRequestBody,
    seasonDetails: SeasonDetails,
  ): Promise<void> {
    let continueEpisodeResponse = await getContinueEpisode(this.serviceClient, {
      seasonId: body.seasonId,
    });
    if (!continueEpisodeResponse.episodeId) {
      let episodeRows = await getEpisodeForConsumerByIndex(
        (query) => this.database.run(query),
        body.seasonId,
        1,
      );
      if (episodeRows.length === 0) {
        throw newNotFoundError(
          `First episode of season ${body.seasonId} may be deleted.`,
        );
      }
      seasonDetails.continueEpisode = {
        episodeId: episodeRows[0].episodeEpisodeId,
        name: episodeRows[0].episodeName,
        index: 1,
        videoLength: episodeRows[0].episodeVideoLength,
        upcomingPremierTimestamp: episodeRows[0].episodePremierTimestamp,
      };
      seasonDetails.continueTimestampstamp = 0;
    } else {
      let episodeRows = await getEpisodeForConsumer(
        (query) => this.database.run(query),
        body.seasonId,
        continueEpisodeResponse.episodeId,
      );
      if (episodeRows.length === 0) {
        throw newNotFoundError(
          `Season ${body.seasonId} episode ${continueEpisodeResponse.episodeId} may be deleted.`,
        );
      }
      seasonDetails.continueEpisode = {
        episodeId: continueEpisodeResponse.episodeId,
        name: episodeRows[0].episodeName,
        index: episodeRows[0].episodeIndex,
        videoLength: episodeRows[0].episodeVideoLength,
        upcomingPremierTimestamp: episodeRows[0].episodePremierTimestamp,
      };
      seasonDetails.continueTimestampstamp =
        continueEpisodeResponse.continueTimestamp;
    }
  }
}
