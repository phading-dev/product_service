import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { getIndividualSeasonRating } from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { GetIndividualSeasonRatingHandlerInterface } from "@phading/product_service_interface/show/web/consumer/handler";
import {
  GetIndividualSeasonRatingRequestBody,
  GetIndividualSeasonRatingResponse,
} from "@phading/product_service_interface/show/web/consumer/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class GetIndividualSeasonRatingHandler extends GetIndividualSeasonRatingHandlerInterface {
  public static create(): GetIndividualSeasonRatingHandler {
    return new GetIndividualSeasonRatingHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
    );
  }

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: GetIndividualSeasonRatingRequestBody,
    authStr: string,
  ): Promise<GetIndividualSeasonRatingResponse> {
    if (!body.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    let { accountId, capabilities } = await this.serviceClient.send(
      newFetchSessionAndCheckCapabilityRequest({
        signedSession: authStr,
        capabilitiesMask: {
          checkCanConsume: true,
        },
      }),
    );
    if (!capabilities.canConsume) {
      throw newUnauthorizedError(
        `Account ${accountId} is not allowed to get season rating.`,
      );
    }
    let ratingRows = await getIndividualSeasonRating(this.database, {
      individualSeasonRatingRaterIdEq: accountId,
      individualSeasonRatingSeasonIdEq: body.seasonId,
    });
    if (ratingRows.length === 0) {
      // No rating found.
      return {};
    } else {
      return {
        rating: ratingRows[0].individualSeasonRatingRating,
      };
    }
  }
}
