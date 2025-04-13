import { MAX_LIST_SEASONS_ITEMS } from "../../../common/constants";
import { toTodaISOString } from "../../../common/date_helper";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { listPublishedSeasonsByPremiereTimeForConsumer } from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { getLatestSeasonGradeAndSummarizeSeason } from "./common/get_latest_season_grade_and_summarize_season";
import { Database } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { ListSeasonsByRecentPremiereTimeHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  ListSeasonsByRecentPremiereTimeRequestBody,
  ListSeasonsByRecentPremiereTimeResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { SeasonSummary } from "@phading/product_service_interface/show/web/consumer/summary";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class ListSeasonsByRecentPremiereTimeHandler extends ListSeasonsByRecentPremiereTimeHandlerInterface {
  public static create(): ListSeasonsByRecentPremiereTimeHandler {
    return new ListSeasonsByRecentPremiereTimeHandler(
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
    body: ListSeasonsByRecentPremiereTimeRequestBody,
    sessionStr: string,
  ): Promise<ListSeasonsByRecentPremiereTimeResponse> {
    if (!body.limit) {
      throw newBadRequestError(`"limit" is required.`);
    }
    if (body.limit > MAX_LIST_SEASONS_ITEMS) {
      throw newBadRequestError(`"limit" is too large.`);
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
        `Account ${accountId} not allowed to list seasons by recent publish time.`,
      );
    }
    let nowDate = this.getNowDate();
    let now = nowDate.valueOf();
    let todayStr = toTodaISOString(nowDate);
    let seasonRows = await listPublishedSeasonsByPremiereTimeForConsumer(
      this.database,
      {
        seasonStateEq: SeasonState.PUBLISHED,
        seasonRecentPremiereTimeMsLt: body.premiereTimeCursor ?? now,
        seasonRecentPremiereTimeMsEq: body.premiereTimeCursor ?? now,
        seasonCreatedTimeMsLt: body.createdTimeCursor ?? now,
        limit: body.limit,
      },
    );
    let seasons = new Array<SeasonSummary>(seasonRows.length);
    await Promise.all(
      seasonRows.map(async (row, i) => {
        await getLatestSeasonGradeAndSummarizeSeason(
          this.database,
          this.coverImagePublicAccessDomain,
          todayStr,
          row,
          i,
          seasons,
        );
      }),
    );
    return {
      seasons,
      premiereTimeCursor:
        seasonRows.length === body.limit
          ? seasonRows[seasonRows.length - 1].seasonRecentPremiereTimeMs
          : undefined,
      createdTimeCursor:
        seasonRows.length === body.limit
          ? seasonRows[seasonRows.length - 1].seasonCreatedTimeMs
          : undefined,
    };
  }
}
