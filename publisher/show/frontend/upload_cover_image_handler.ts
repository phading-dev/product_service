import getStream = require("get-stream");
import sharp = require("sharp");
import stream = require("stream");
import util = require("util");
import { SEASON_COVER_IMAGE_BUCKET } from "../../../common/cloud_storage";
import {
  COVER_IMAGE_HEIGHT,
  COVER_IMAGE_WIDTH,
  MAX_COVER_IMAGE_BUFFER_SIZE,
} from "../../../common/constants";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  getSeasonMetadata,
  updateSeasonLastChangeTimestampStatement,
} from "../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { Bucket } from "@google-cloud/storage";
import { UploadCoverImageHandlerInterface } from "@phading/product_service_interface/publisher/show/frontend/handler";
import {
  UploadCoverImageRequestMetadata,
  UploadCoverImageResponse,
} from "@phading/product_service_interface/publisher/show/frontend/interface";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/backend/client";
import {
  newBadRequestError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";
import { Readable } from "stream";
let pipeline = util.promisify(stream.pipeline);

export class UploadCoverImageHandler extends UploadCoverImageHandlerInterface {
  public static create(): UploadCoverImageHandler {
    return new UploadCoverImageHandler(
      SPANNER_DATABASE,
      SEASON_COVER_IMAGE_BUCKET,
      SERVICE_CLIENT,
      () => Date.now(),
    );
  }

  public constructor(
    private database: Database,
    private bucket: Bucket,
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
    await pipeline(
      sharp(data)
        .resize(COVER_IMAGE_WIDTH, COVER_IMAGE_HEIGHT, { fit: "contain" })
        .jpeg({
          quality: 80,
          progressive: true,
        }),
      this.bucket
        .file(metadataRows[0].seasonCoverImageFilename)
        .createWriteStream({ resumable: false }),
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
