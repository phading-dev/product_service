import getStream = require("get-stream");
import sharp = require("sharp");
import { SEASON_COVER_IMAGE_BUCKET_NAME } from "../../../common/env_vars";
import { COVER_IMAGE_HEIGHT, COVER_IMAGE_WIDTH } from "../../../common/params";
import { S3_CLIENT } from "../../../common/s3_client";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteCoverImageDeletingTaskStatement,
  getSeasonForPublisher,
  insertCoverImageDeletingTaskStatement,
  insertCoverImageFileStatement,
  updateCoverImageDeletingTaskStatement,
  updateSeasonStatement,
} from "../../../db/sql";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Database } from "@google-cloud/spanner";
import { MAX_COVER_IMAGE_BUFFER_SIZE } from "@phading/constants/show";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { UploadCoverImageHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  UploadCoverImageRequestMetadata,
  UploadCoverImageResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { exchangeSessionAndCheckCapability } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newConflictError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";
import { PassThrough, Readable } from "stream";
import { pipeline } from "stream/promises";

export class UploadCoverImageHandler extends UploadCoverImageHandlerInterface {
  public static create(): UploadCoverImageHandler {
    return new UploadCoverImageHandler(
      SPANNER_DATABASE,
      S3_CLIENT,
      SERVICE_CLIENT,
      () => Date.now(),
      () => crypto.randomUUID(),
    );
  }

  private static ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
  private static DELAY_TO_CLEAN_UP_ON_ERROR_MS = 5 * 60 * 1000;
  public interferFn: () => Promise<void> = () => Promise.resolve();

  public constructor(
    private database: Database,
    private s3Client: S3Client,
    private serviceClient: NodeServiceClient,
    private getNow: () => number,
    private generateUuid: () => string,
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
    let { accountId, canPublishShows } =
      await exchangeSessionAndCheckCapability(this.serviceClient, {
        signedSession: sessionStr,
        checkCanPublishShows: true,
      });
    if (!canPublishShows) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to upload cover image.`,
      );
    }
    let coverImageR2Filename: string;
    await this.database.runTransactionAsync(async (transaction) => {
      let seasonRows = await getSeasonForPublisher(
        this.database,
        accountId,
        metadata.seasonId,
      );
      if (seasonRows.length === 0) {
        throw newNotFoundError(`Season ${metadata.seasonId} is not found.`);
      }
      let { seasonData } = seasonRows[0];
      if (seasonData.state === SeasonState.ARCHIVED) {
        throw newBadRequestError(
          `Season ${metadata.seasonId} is archived and cannot be updated anymore.`,
        );
      }

      let now = this.getNow();
      coverImageR2Filename = this.generateUuid();
      await transaction.batchUpdate([
        insertCoverImageFileStatement(coverImageR2Filename),
        insertCoverImageDeletingTaskStatement(
          coverImageR2Filename,
          now + UploadCoverImageHandler.ONE_YEAR_MS,
          now,
        ),
      ]);
      await transaction.commit();
    });

    try {
      await this.uploadAndFinalize(
        body,
        coverImageR2Filename,
        accountId,
        metadata.seasonId,
      );
    } catch (e) {
      await this.database.runTransactionAsync(async (transaction) => {
        await transaction.batchUpdate([
          updateCoverImageDeletingTaskStatement(
            coverImageR2Filename,
            this.getNow() +
              UploadCoverImageHandler.DELAY_TO_CLEAN_UP_ON_ERROR_MS,
          ),
        ]);
        await transaction.commit();
      });
      throw e;
    }
    return {};
  }

  private async uploadAndFinalize(
    body: Readable,
    coverImageR2Filename: string,
    accountId: string,
    seasonId: string,
  ): Promise<void> {
    await this.interferFn();
    let data = await getStream.buffer(body, {
      maxBuffer: MAX_COVER_IMAGE_BUFFER_SIZE,
    });
    let passThrough = new PassThrough();
    let upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: SEASON_COVER_IMAGE_BUCKET_NAME,
        Key: coverImageR2Filename,
        Body: passThrough,
        ContentType: "image/jpeg",
      },
    });
    pipeline(
      sharp(data)
        .resize(COVER_IMAGE_WIDTH, COVER_IMAGE_HEIGHT, { fit: "contain" })
        .jpeg({
          quality: 80,
          progressive: true,
        }),
      passThrough,
    );
    await upload.done();
    await this.database.runTransactionAsync(async (transaction) => {
      let seasonRows = await getSeasonForPublisher(
        this.database,
        accountId,
        seasonId,
      );
      if (seasonRows.length === 0) {
        throw newConflictError(`Season ${seasonId} is not found.`);
      }
      let { seasonData } = seasonRows[0];
      let now = this.getNow();
      let oldCoverImageR2Filename = seasonData.coverImageR2Filename;
      seasonData.coverImageR2Filename = coverImageR2Filename;
      seasonData.lastChangeTimeMs = now;
      await transaction.batchUpdate([
        updateSeasonStatement(seasonData),
        deleteCoverImageDeletingTaskStatement(coverImageR2Filename),
        ...(oldCoverImageR2Filename
          ? [
              insertCoverImageDeletingTaskStatement(
                oldCoverImageR2Filename,
                now,
                now,
              ),
            ]
          : []),
      ]);
      await transaction.commit();
    });
  }
}
