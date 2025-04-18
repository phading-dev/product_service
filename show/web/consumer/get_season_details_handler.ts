import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getLastSeasonGrades,
  getPublishedSeasonAllForConsumer,
} from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { NextGrade } from "@phading/product_service_interface/show/web/consumer/details";
import { GetSeasonDetailsHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  GetSeasonDetailsRequestBody,
  GetSeasonDetailsResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newInternalServerErrorError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";
import { TzDate } from "@selfage/tz_date";

export class GetSeasonDetailsHandler extends GetSeasonDetailsHandlerInterface {
  public static create(): GetSeasonDetailsHandler {
    return new GetSeasonDetailsHandler(
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
    body: GetSeasonDetailsRequestBody,
    sessionStr: string,
  ): Promise<GetSeasonDetailsResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    let { accountId, capabilities } = await this.serviceClient.send(
      newFetchSessionAndCheckCapabilityRequest({
        signedSession: sessionStr,
        capabilitiesMask: {
          checkCanConsume: true,
        },
      }),
    );
    if (!capabilities.canConsume) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to get season details.`,
      );
    }
    let todayStr = TzDate.fromDate(
      this.getNowDate(),
      ENV_VARS.timezoneNegativeOffset,
    ).toLocalDateISOString();
    let [seasonRows, seasonGradeRows] = await Promise.all([
      getPublishedSeasonAllForConsumer(this.database, {
        seasonSeasonIdEq: body.seasonId,
        seasonStateEq: SeasonState.PUBLISHED,
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
    if (seasonGradeRows.length === 0 || seasonGradeRows.length > 2) {
      throw newInternalServerErrorError(
        `Season ${body.seasonId} has unexpected number of season grades: ${seasonGradeRows.length}.`,
      );
    }

    let grade: number;
    let nextGrade: NextGrade;
    if (seasonGradeRows.length === 1) {
      grade = seasonGradeRows[0].seasonGradeGrade;
    } else if (seasonGradeRows.length === 2) {
      grade = seasonGradeRows[1].seasonGradeGrade;
      nextGrade = {
        grade: seasonGradeRows[0].seasonGradeGrade,
        effectiveDate: seasonGradeRows[0].seasonGradeStartDate,
      };
    }
    let row = seasonRows[0];
    return {
      seasonDetails: {
        publisherId: row.seasonPublisherId,
        name: row.seasonName,
        coverImageUrl: `${this.coverImagePublicAccessDomain}/${row.seasonCoverImageR2Filename}`,
        totalEpisodes: row.seasonTotalEpisodes,
        description: row.seasonDescription,
        grade,
        nextGrade,
        averageRating: row.seasonAverageRating,
        ratingsCount: row.seasonRatingsCount,
      },
    };
  }
}
