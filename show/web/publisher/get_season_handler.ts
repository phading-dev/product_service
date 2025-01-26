import { COVER_IMAGE_PUBLIC_ACCESS_DOMAIN } from "../../../common/env_vars";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GetLastSeasonGradesRow,
  getLastSeasonGrades,
  getSeasonAndMoreForPublisher,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { getTodayWrtTimezone } from "@phading/product_meter_service_interface/node/client";
import { GetSeasonHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  GetSeasonRequestBody,
  GetSeasonResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { NextGrade } from "@phading/product_service_interface/show/web/publisher/season_details";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/node/client";
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
      COVER_IMAGE_PUBLIC_ACCESS_DOMAIN,
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private coverImagePublicAccessDomain: string,
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
    let { accountId, capabilities } = await exchangeSessionAndCheckCapability(
      this.serviceClient,
      {
        signedSession: sessionStr,
        capabilitiesMask: {
          checkCanPublishShows: true,
        },
      },
    );
    if (!capabilities.canPublishShows) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to get season details.`,
      );
    }
    let [seasonRows, seasonGradeRows] = await Promise.all([
      getSeasonAndMoreForPublisher(this.database, accountId, body.seasonId),
      this.getLastSeasonGrades(body.seasonId),
    ]);
    if (seasonRows.length === 0) {
      throw newNotFoundError(`Season ${body.seasonId} is not found.`);
    }
    let grade: number;
    let nextGrade: NextGrade;
    if (seasonGradeRows.length === 1) {
      grade = seasonGradeRows[0].seasonGradeData.grade;
    } else {
      grade = seasonGradeRows[1].seasonGradeData.grade;
      nextGrade = {
        grade: seasonGradeRows[0].seasonGradeData.grade,
        effectiveDate: seasonGradeRows[0].seasonGradeData.startDate,
      };
    }
    let { sData, mData } = seasonRows[0];
    return {
      seasonDetails: {
        name: sData.name,
        state: sData.state,
        description: mData.description,
        coverImageUrl: sData.coverImageR2Filename
          ? `${this.coverImagePublicAccessDomain}/${sData.coverImageR2Filename}`
          : undefined,
        totalEpisodes: sData.totalEpisodes,
        createdTimeMs: mData.createdTimeMs,
        lastChangeTimeMs: sData.lastChangeTimeMs,
        grade,
        nextGrade,
      },
    };
  }

  private async getLastSeasonGrades(
    seasonId: string,
  ): Promise<Array<GetLastSeasonGradesRow>> {
    let { date } = await getTodayWrtTimezone(this.serviceClient, {});
    return getLastSeasonGrades(this.database, seasonId, date, 2);
  }
}
