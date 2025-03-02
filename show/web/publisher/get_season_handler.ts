import { toTodaISOString } from "../../../common/date_helper";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getLastSeasonGrades,
  getSeasonAndMoreForPublisher,
} from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { GetSeasonHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  GetSeasonRequestBody,
  GetSeasonResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { NextGrade } from "@phading/product_service_interface/show/web/publisher/season_details";
import { newExchangeSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
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
      newExchangeSessionAndCheckCapabilityRequest({
        signedSession: sessionStr,
        capabilitiesMask: {
          checkCanPublishShows: true,
        },
      }),
    );
    if (!capabilities.canPublishShows) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to get season details.`,
      );
    }
    let todayStr = toTodaISOString(this.getNowDate());
    let [seasonRows, seasonGradeRows] = await Promise.all([
      getSeasonAndMoreForPublisher(this.database, accountId, body.seasonId),
      getLastSeasonGrades(this.database, body.seasonId, todayStr, 2),
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
}
