import { SEASON_COVER_IMAGE_BUCKET } from "../../../common/cloud_storage";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getEpisodeDrafts,
  getLastEpisodes,
  getLastTwoSeasonGrade,
  getSeasonDetails,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { Bucket } from "@google-cloud/storage";
import { GetSeasonDetailsHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  GetSeasonDetailsRequestBody,
  GetSeasonDetailsResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { NextGrade } from "@phading/product_service_interface/publisher/show/frontend/season_details";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import {
  newBadRequestError,
  newInternalServerErrorError,
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
    let { userSession, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (!canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to get season details.`,
      );
    }
    let now = this.getNow();
    let [seasonDetailsRows, seasonGradeRows, episodeDraftRows, episodeRows] =
      await Promise.all([
        getSeasonDetails(this.database, body.seasonId, userSession.accountId),
        getLastTwoSeasonGrade(this.database, body.seasonId, now),
        getEpisodeDrafts(this.database, body.seasonId),
        getLastEpisodes(this.database, body.seasonId),
      ]);
    if (seasonDetailsRows.length === 0) {
      throw newNotFoundError(`Season ${body.seasonId} is not found.`);
    }
    let grade: number;
    let nextGrade: NextGrade;
    if (seasonGradeRows.length === 1) {
      if (seasonGradeRows[0].seasonGradeStartTimestamp > now) {
        throw newInternalServerErrorError(
          `Season ${body.seasonId} has invalid grades. Grade ${seasonGradeRows[0].seasonGradeGradeId}'s start timestamp ${seasonGradeRows[0].seasonGradeStartTimestamp} should be smaller than now ${now}.`,
        );
      }
      grade = seasonGradeRows[0].seasonGradeGrade;
    } else {
      if (seasonGradeRows[0].seasonGradeStartTimestamp <= now) {
        throw newInternalServerErrorError(
          `Season ${body.seasonId} has invalid grades. Grade ${seasonGradeRows[0].seasonGradeGradeId}'s start timestamp ${seasonGradeRows[0].seasonGradeStartTimestamp} should be larger than now ${now}.`,
        );
      }
      if (seasonGradeRows[1].seasonGradeStartTimestamp > now) {
        throw newInternalServerErrorError(
          `Season ${body.seasonId} has invalid grades. Grade ${seasonGradeRows[1].seasonGradeGradeId}'s start timestamp ${seasonGradeRows[1].seasonGradeStartTimestamp} should be smaller than now ${now}.`,
        );
      }
      grade = seasonGradeRows[1].seasonGradeGrade;
      nextGrade = {
        grade: seasonGradeRows[0].seasonGradeGrade,
        effectiveTimestamp: seasonGradeRows[0].seasonGradeStartTimestamp,
      };
    }
    return {
      seasonDetails: {
        seasonId: body.seasonId,
        name: seasonDetailsRows[0].seasonName,
        description: seasonDetailsRows[0].seasonDescription,
        coverImageUrl: this.bucket
          .file(seasonDetailsRows[0].seasonCoverImageFilename)
          .publicUrl(),
        grade,
        nextGrade,
        createdTimestamp: seasonDetailsRows[0].seasonCreatedTimestamp,
        lastChangeTimestamp: seasonDetailsRows[0].seasonLastChangeTimestamp,
        state: seasonDetailsRows[0].seasonState,
        totalEpisodes: seasonDetailsRows[0].seasonTotalEpisodes,
      },
      drafts: episodeDraftRows.map((row) => {
        return {
          episodeId: row.episodeDraftEpisodeId,
          name: row.episodeDraftName,
          videoState: row.episodeDraftVideoState,
          resumableVideoUpload: row.episodeDraftResumableVideoUpload,
          videoUploadedTimestamp: row.episodeDraftVideoUploadedTimestamp,
          videoLength: row.episodeDraftVideoLength,
          videoSize: row.episodeDraftVideoSize,
        };
      }),
      episodes: episodeRows.map((row) => {
        return {
          episodeId: row.episodeEpisodeId,
          name: row.episodeName,
          index: row.episodeIndex,
          videoLength: row.episodeVideoLength,
          videoSize: row.episodeVideoSize,
          publishedTimestamp: row.episodePublishedTimestamp,
          premierTimestamp: row.episodePremierTimestamp,
        };
      }),
      indexCursor:
        episodeRows.length === 0
          ? 0
          : episodeRows[episodeRows.length - 1].episodeIndex,
    };
  }
}
