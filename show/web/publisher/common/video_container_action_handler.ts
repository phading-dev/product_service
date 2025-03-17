import {
  getEpisodeForPublisher,
  updateSeasonLastChangeTimeStatement,
} from "../../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";
import { ClientRequestInterface } from "@selfage/service_descriptor/client_request_interface";

export class VideoContainerActionHandler {
  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private getNow: () => number,
  ) {}

  public async handle<Response>(
    loggingPrefix: string,
    seasonId: string | undefined,
    episodeId: string | undefined,
    authStr: string,
    newRequest: (videoContainerId: string) => ClientRequestInterface<Response>,
  ): Promise<Response> {
    if (!seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    if (!episodeId) {
      throw newBadRequestError(`"episodeId" is required.`);
    }
    let { accountId, capabilities } = await this.serviceClient.send(
      newFetchSessionAndCheckCapabilityRequest({
        signedSession: authStr,
        capabilitiesMask: {
          checkCanPublish: true,
        },
      }),
    );
    if (!capabilities.canPublish) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to perform actions on video container.`,
      );
    }
    let rows = await getEpisodeForPublisher(this.database, {
      seasonPublisherIdEq: accountId,
      episodeSeasonIdEq: seasonId,
      episodeEpisodeIdEq: episodeId,
    });
    if (rows.length === 0) {
      throw newNotFoundError(
        `Season ${seasonId} or episode ${episodeId} is not found.`,
      );
    }
    let row = rows[0];
    if (!row.episodeVideoContainerId) {
      throw newBadRequestError(
        `Season ${seasonId} episode ${episodeId} does not have a video container yet.`,
      );
    }
    let response = await this.serviceClient.send(
      newRequest(row.episodeVideoContainerId),
    );
    await this.database.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([
        updateSeasonLastChangeTimeStatement({
          seasonSeasonIdEq: seasonId,
          setLastChangeTimeMs: this.getNow(),
        }),
      ]);
      await transaction.commit();
    });
    return response;
  }
}
