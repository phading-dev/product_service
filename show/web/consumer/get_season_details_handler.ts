import { toTodayISOString } from "../../../common/date_helper";
import { COVER_IMAGE_PUBLIC_ACCESS_DOMAIN } from "../../../common/env_vars";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GetLastSeasonGradesRow,
  getLastSeasonGrades,
  getPublishedSeasonAndMoreForConsumer,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { getTimezoneOffset } from "@phading/product_meter_service_interface/node/client";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { GetSeasonDetailsHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  GetSeasonDetailsRequestBody,
  GetSeasonDetailsResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { NextGrade } from "@phading/product_service_interface/show/web/consumer/season_details";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/node/client";
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
      SERVICE_CLIENT,
      COVER_IMAGE_PUBLIC_ACCESS_DOMAIN,
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
    let { accountId, canConsumeShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanConsumeShows: true,
      });
    if (!canConsumeShows) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to get season details.`,
      );
    }
    let [seasonRows, seasonGradeRows] = await Promise.all([
      getPublishedSeasonAndMoreForConsumer(
        this.database,
        body.seasonId,
        SeasonState.PUBLISHED,
      ),
      this.getLastSeasonGrades(body.seasonId),
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
      grade = seasonGradeRows[0].seasonGradeData.grade;
    } else if (seasonGradeRows.length === 2) {
      grade = seasonGradeRows[1].seasonGradeData.grade;
      nextGrade = {
        grade: seasonGradeRows[0].seasonGradeData.grade,
        effectiveDate: seasonGradeRows[0].seasonGradeData.startDate,
      };
    }
    let { sData, mData } = seasonRows[0];
    return {
      seasonDetails: {
        publisherId: sData.publisherId,
        name: sData.name,
        coverImageUrl: `${this.coverImagePublicAccessDomain}/${sData.coverImageR2Filename}`,
        totalEpisodes: sData.totalEpisodes,
        description: mData.description,
        grade,
        nextGrade,
      },
    };
  }

  private async getLastSeasonGrades(
    seasonId: string,
  ): Promise<Array<GetLastSeasonGradesRow>> {
    let { negativeOffset } = await getTimezoneOffset(this.serviceClient, {});
    return getLastSeasonGrades(
      this.database,
      seasonId,
      toTodayISOString(this.getNowDate(), negativeOffset),
      2,
    );
  }
}
