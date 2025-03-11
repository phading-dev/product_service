import { MAX_LIST_SEASONS_ITEMS } from "../../../common/constants";
import { toTodaISOString } from "../../../common/date_helper";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getLastSeasonGrades,
  listPublishedSeasonsByPublishTimeForConsumer,
} from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { ListSeasonsByRecentPremierTimeHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  ListSeasonsByRecentPremierTimeRequestBody,
  ListSeasonsByRecentPremierTimeResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { SeasonSummary } from "@phading/product_service_interface/show/web/consumer/season_summary";
import { newExchangeSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newInternalServerErrorError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class ListSeasonsByRecentPremierTimeHandler extends ListSeasonsByRecentPremierTimeHandlerInterface {
  public static create(): ListSeasonsByRecentPremierTimeHandler {
    return new ListSeasonsByRecentPremierTimeHandler(
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
    body: ListSeasonsByRecentPremierTimeRequestBody,
    sessionStr: string,
  ): Promise<ListSeasonsByRecentPremierTimeResponse> {
    if (!body.limit) {
      throw newBadRequestError(`"limit" is required.`);
    }
    if (body.limit > MAX_LIST_SEASONS_ITEMS) {
      throw newBadRequestError(`"limit" is too large.`);
    }
    let { accountId, capabilities } = await this.serviceClient.send(
      newExchangeSessionAndCheckCapabilityRequest({
        signedSession: sessionStr,
        capabilitiesMask: {
          checkCanConsumeShows: true,
        },
      }),
    );
    if (!capabilities.canConsumeShows) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to list seasons by recent publish time.`,
      );
    }
    let nowDate = this.getNowDate();
    let now = nowDate.valueOf();
    let todayStr = toTodaISOString(nowDate);
    let seasonRows = await listPublishedSeasonsByPublishTimeForConsumer(
      this.database,
      SeasonState.PUBLISHED,
      body.premierTimeCursor ?? now,
      body.limit,
    );
    let seasons = new Array<SeasonSummary>(seasonRows.length);
    await Promise.all(
      seasonRows.map(async (row, i) => {
        let gradeRows = await getLastSeasonGrades(
          this.database,
          row.sData.seasonId,
          todayStr,
          1,
        );
        if (gradeRows.length === 0) {
          throw newInternalServerErrorError(
            `Season ${row.sData.seasonId} has no grade at today ${todayStr}.`,
          );
        }
        let { sData, srData } = row;
        seasons[i] = {
          seasonId: sData.seasonId,
          publisherId: sData.publisherId,
          name: sData.name,
          coverImageUrl: `${this.coverImagePublicAccessDomain}/${sData.coverImageR2Filename}`,
          totalEpisodes: sData.totalEpisodes,
          averageRating: srData ? srData.averageRating : 0,
          grade: gradeRows[0].seasonGradeData.grade,
        };
      }),
    );
    return {
      seasons,
      premierTimeCursor:
        seasonRows.length === body.limit
          ? seasonRows[seasonRows.length - 1].sData.recentPremierTimeMs
          : undefined,
    };
  }
}
