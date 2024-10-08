import getStream = require("get-stream");
import sharp = require("sharp");
import { UPLOAD_CLIENT } from "../../../common/cloud_storage";
import {
  COVER_IMAGE_HEIGHT,
  COVER_IMAGE_WIDTH,
  MAX_COVER_IMAGE_BUFFER_SIZE,
} from "../../../common/constants";
import { SEASON_COVER_IMAGE_BUCKET_NAME } from "../../../common/env_variables";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getSeasonMetadata,
  updateSeasonLastChangeTimestampStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { UploadCoverImageHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  UploadCoverImageRequestMetadata,
  UploadCoverImageResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import { CloudStorageClient } from "@selfage/gcs_client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";
import { Readable } from "stream";

export class UploadCoverImageHandler extends UploadCoverImageHandlerInterface {
  public static create(): UploadCoverImageHandler {
    return new UploadCoverImageHandler(
      SPANNER_DATABASE,
      UPLOAD_CLIENT,
      SERVICE_CLIENT,
      () => Date.now(),
    );
  }

  public constructor(
    private database: Database,
    private uploadClient: CloudStorageClient,
    private serviceClient: NodeServiceClient,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: Readable,
    metadata: UploadCoverImageRequestMetadata,
    sessionStr: string,
  ): Promise<UploadCoverImageResponse> {
    if (!metadata.seasonId) {
      throw newBadRequestError(`"seasonId" is required.`);
    }
    let { userSession, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (!canPublishShows) {
      throw newUnauthorizedError(
        `Account ${userSession.accountId} not allowed to upload cover image.`,
      );
    }
    let metadataRows = await getSeasonMetadata(
      this.database,
      metadata.seasonId,
      userSession.accountId,
    );
    if (metadataRows.length === 0) {
      throw newNotFoundError(`Season ${metadata.seasonId} is not found.`);
    }
    if (metadataRows[0].seasonState === SeasonState.ARCHIVED) {
      throw newBadRequestError(
        `Season ${metadata.seasonId} is archived and cannot be updated anymore.`,
      );
    }
    let data = await getStream.buffer(body, {
      maxBuffer: MAX_COVER_IMAGE_BUFFER_SIZE,
    });
    await this.uploadClient.upload(
      SEASON_COVER_IMAGE_BUCKET_NAME,
      metadataRows[0].seasonCoverImageFilename,
      sharp(data)
        .resize(COVER_IMAGE_WIDTH, COVER_IMAGE_HEIGHT, { fit: "contain" })
        .jpeg({
          quality: 80,
          progressive: true,
        }),
      "image/jpeg",
    );
    await this.database.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([
        updateSeasonLastChangeTimestampStatement(
          this.getNow(),
          metadata.seasonId,
        ),
      ]);
      await transaction.commit();
    });
    return {};
  }
}
