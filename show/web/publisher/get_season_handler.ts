import { toTodaISOString } from "../../../common/date_helper";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getLastSeasonGrades,
  getSeasonAllAndRatingForPublisher,
} from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { GetSeasonHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  GetSeasonRequestBody,
  GetSeasonResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { NextGrade } from "@phading/product_service_interface/show/web/publisher/season_details";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class GetSeasonHandler extends GetSeasonHandlerInterface {
  public static create(): GetSeasonHandler {
    return new GetSeasonHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      ENV_VARS.r2SeasonCoverImagePublicAccessDomain,
      () => new Date(),
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private coverImagePublicAccessDomain: string,
    private getNowDate: () => Date,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: GetSeasonRequestBody,
    sessionStr: string,
  ): Promise<GetSeasonResponse> {
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
        `Account ${accountId} not allowed to get season details.`,
      );
    }
    let todayStr = toTodaISOString(this.getNowDate());
    let [seasonRows, seasonGradeRows] = await Promise.all([
      getSeasonAllAndRatingForPublisher(this.database, {
        sPublisherIdEq: accountId,
        sSeasonIdEq: body.seasonId,
      }),
      getLastSeasonGrades(this.database, {
        seasonGradeSeasonIdEq: body.seasonId,
        seasonGradeEndDateGt: todayStr,
        limit: 2,
      }),
    ]);
    if (seasonRows.length === 0) {
      throw newNotFoundError(`Season ${body.seasonId} is not found.`);
    }
    let grade: number;
    let nextGrade: NextGrade;
    if (seasonGradeRows.length === 1) {
      grade = seasonGradeRows[0].seasonGradeGrade;
    } else {
      grade = seasonGradeRows[1].seasonGradeGrade;
      nextGrade = {
        grade: seasonGradeRows[0].seasonGradeGrade,
        effectiveDate: seasonGradeRows[0].seasonGradeStartDate,
      };
    }
    let season = seasonRows[0];
    return {
      seasonDetails: {
        name: season.sName,
        state: season.sState,
        description: season.sDescription,
        coverImageUrl: season.sCoverImageR2Filename
          ? `${this.coverImagePublicAccessDomain}/${season.sCoverImageR2Filename}`
          : undefined,
        totalEpisodes: season.sTotalEpisodes,
        createdTimeMs: season.sCreatedTimeMs,
        lastChangeTimeMs: season.sLastChangeTimeMs,
        grade,
        nextGrade,
        averageRating: season.srAverageRating ?? 0,
      },
    };
  }
}
