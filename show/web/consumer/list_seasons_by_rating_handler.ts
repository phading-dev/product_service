import { MAX_LIST_SEASONS_ITEMS } from "../../../common/constants";
import { toTodaISOString } from "../../../common/date_helper";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getLastSeasonGrades,
  listPublishedSeasonsByRatingForConsumer,
} from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { Database } from "@google-cloud/spanner";
import { VALID_RATINGS } from "@phading/constants/show";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { ListSeasonsByRatingHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  ListSeasonsByRatingRequestBody,
  ListSeasonsByRatingResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { SeasonSummary } from "@phading/product_service_interface/show/web/consumer/season_summary";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newInternalServerErrorError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class ListSeasonsByRatingHandler extends ListSeasonsByRatingHandlerInterface {
  public static create(): ListSeasonsByRatingHandler {
    return new ListSeasonsByRatingHandler(
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
    body: ListSeasonsByRatingRequestBody,
    sessionStr: string,
  ): Promise<ListSeasonsByRatingResponse> {
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
        `Account ${accountId} not allowed to list seasons by rating.`,
      );
    }
    let nowDate = this.getNowDate();
    let now = nowDate.valueOf();
    let todayStr = toTodaISOString(nowDate);
    let ratingCursor =
      body.ratingCursor ?? VALID_RATINGS[VALID_RATINGS.length - 1] + 1;
    let rows = await listPublishedSeasonsByRatingForConsumer(this.database, {
      sStateEq: SeasonState.PUBLISHED,
      srAverageRatingLt: ratingCursor,
      srAverageRatingEq: ratingCursor,
      srUpdatedTimeMsLt: body.updatedTimeCursor ?? now,
      limit: body.limit,
    });
    let seasons = new Array<SeasonSummary>(rows.length);
    await Promise.all(
      rows.map(async (row, i) => {
        let gradeRows = await getLastSeasonGrades(this.database, {
          seasonGradeSeasonIdEq: row.sSeasonId,
          seasonGradeEndDateGt: todayStr,
          limit: 1,
        });
        if (gradeRows.length === 0) {
          throw newInternalServerErrorError(
            `Season ${row.sSeasonId} has no grade at today ${todayStr}.`,
          );
        }
        seasons[i] = {
          seasonId: row.sSeasonId,
          publisherId: row.sPublisherId,
          name: row.sName,
          coverImageUrl: `${this.coverImagePublicAccessDomain}/${row.sCoverImageR2Filename}`,
          totalEpisodes: row.sTotalEpisodes,
          averageRating: row.srAverageRating,
          grade: gradeRows[0].seasonGradeGrade,
        };
      }),
    );
    return {
      seasons,
      ratingCursor:
        rows.length === body.limit
          ? rows[rows.length - 1].srAverageRating
          : undefined,
      updatedTimeCursor:
        rows.length === body.limit
          ? rows[rows.length - 1].srUpdatedTimeMs
          : undefined,
    };
  }
}
