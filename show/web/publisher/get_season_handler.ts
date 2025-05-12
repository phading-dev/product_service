import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { getLastSeasonGrades, getSeasonAllForPublisher } from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { NextGrade } from "@phading/product_service_interface/show/web/publisher/details";
import { GetSeasonHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  GetSeasonRequestBody,
  GetSeasonResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newInternalServerErrorError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";
import { TzDate } from "@selfage/tz_date";

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
    let todayStr = TzDate.fromNewDate(
      this.getNowDate(),
      ENV_VARS.timezoneNegativeOffset,
    ).toLocalDateISOString();
    let [seasonRows, seasonGradeRows] = await Promise.all([
      getSeasonAllForPublisher(this.database, {
        seasonPublisherIdEq: accountId,
        seasonSeasonIdEq: body.seasonId,
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
    if (seasonGradeRows.length === 0) {
      throw newInternalServerErrorError(
        `Season ${body.seasonId} does not have any grades on today ${todayStr}.`,
      );
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
        name: season.seasonName,
        state: season.seasonState,
        description: season.seasonDescription,
        coverImageUrl: season.seasonCoverImageR2Filename
          ? `${this.coverImagePublicAccessDomain}/${season.seasonCoverImageR2Filename}`
          : undefined,
        totalPublishedEpisodes: season.seasonTotalPublishedEpisodes,
        createdTimeMs: season.seasonCreatedTimeMs,
        lastChangeTimeMs: season.seasonLastChangeTimeMs,
        grade,
        nextGrade,
        averageRating: season.seasonAverageRating,
      },
    };
  }
}
