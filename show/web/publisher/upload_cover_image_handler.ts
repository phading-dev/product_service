import getStream = require("get-stream");
import sharp = require("sharp");
import { S3_CLIENT } from "../../../common/s3_client";
import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteCoverImageDeletingTaskStatement,
  getSeasonForPublisher,
  insertCoverImageDeletingTaskStatement,
  insertCoverImageFileStatement,
  updateCoverImageDeletingTaskMetadataStatement,
  updateSeasonCoverImageStatement,
} from "../../../db/sql";
import { ENV_VARS } from "../../../env_vars";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Database } from "@google-cloud/spanner";
import {
  COVER_IMAGE_HEIGHT,
  COVER_IMAGE_WIDTH,
  MAX_COVER_IMAGE_BUFFER_SIZE,
} from "@phading/constants/show";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { UploadCoverImageHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  UploadCoverImageRequestMetadata,
  UploadCoverImageResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newFetchSessionAndCheckCapabilityRequest } from "@phading/user_session_service_interface/node/client";
import {
  newBadRequestError,
  newConflictError,
  newNotFoundError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";
import { Ref } from "@selfage/ref";
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
  public interfereFn: () => Promise<void> = () => Promise.resolve();

  public constructor(
    private database: Database,
    private s3Client: Ref<S3Client>,
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
    let { accountId, capabilities } = await this.serviceClient.send(
      newFetchSessionAndCheckCapabilityRequest({
        signedSession: sessionStr,
        capabilitiesMask: {
          checkCanPublish: true,
        },
      }),
    );
    if (!capabilities.canPublish) {
      throw newUnauthorizedError(
        `Account ${accountId} not allowed to upload cover image.`,
      );
    }
    let coverImageR2Filename: string;
    await this.database.runTransactionAsync(async (transaction) => {
      let seasonRows = await getSeasonForPublisher(this.database, {
        seasonPublisherIdEq: accountId,
        seasonSeasonIdEq: metadata.seasonId,
      });
      if (seasonRows.length === 0) {
        throw newNotFoundError(`Season ${metadata.seasonId} is not found.`);
      }
      let season = seasonRows[0];
      if (season.seasonState === SeasonState.ARCHIVED) {
        throw newBadRequestError(
          `Season ${metadata.seasonId} is archived and cannot be updated anymore.`,
        );
      }

      let now = this.getNow();
      coverImageR2Filename = this.generateUuid();
      await transaction.batchUpdate([
        insertCoverImageFileStatement({ r2Filename: coverImageR2Filename }),
        insertCoverImageDeletingTaskStatement({
          r2Filename: coverImageR2Filename,
          retryCount: 0,
          executionTimeMs: now + UploadCoverImageHandler.ONE_YEAR_MS,
          createdTimeMs: now,
        }),
      ]);
      await transaction.commit();
    });

    try {
      await this.uploadAndFinalize(
        loggingPrefix,
        body,
        coverImageR2Filename,
        accountId,
        metadata.seasonId,
      );
    } catch (e) {
      await this.database.runTransactionAsync(async (transaction) => {
        await transaction.batchUpdate([
          updateCoverImageDeletingTaskMetadataStatement({
            coverImageDeletingTaskR2FilenameEq: coverImageR2Filename,
            setRetryCount: 0,
            setExecutionTimeMs:
              this.getNow() +
              UploadCoverImageHandler.DELAY_TO_CLEAN_UP_ON_ERROR_MS,
          }),
        ]);
        await transaction.commit();
      });
      throw e;
    }
    return {};
  }

  private async uploadAndFinalize(
    loggingPrefix: string,
    body: Readable,
    coverImageR2Filename: string,
    accountId: string,
    seasonId: string,
  ): Promise<void> {
    await this.interfereFn();
    let data = await getStream.buffer(body, {
      maxBuffer: MAX_COVER_IMAGE_BUFFER_SIZE,
    });
    let passThrough = new PassThrough();
    let upload = new Upload({
      client: this.s3Client.val,
      params: {
        Bucket: ENV_VARS.r2SeasonCoverImageBucketName,
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
    ).catch((e) => {
      console.error(`${loggingPrefix} Error while processing cover image:`, e);
      upload.abort();
    });
    await upload.done();
    await this.database.runTransactionAsync(async (transaction) => {
      let seasonRows = await getSeasonForPublisher(this.database, {
        seasonPublisherIdEq: accountId,
        seasonSeasonIdEq: seasonId,
      });
      if (seasonRows.length === 0) {
        throw newConflictError(`Season ${seasonId} is not found.`);
      }
      let season = seasonRows[0];
      let now = this.getNow();
      let oldCoverImageR2Filename = season.seasonCoverImageR2Filename;
      await transaction.batchUpdate([
        updateSeasonCoverImageStatement({
          seasonSeasonIdEq: seasonId,
          setCoverImageR2Filename: coverImageR2Filename,
          setLastChangeTimeMs: now,
        }),
        deleteCoverImageDeletingTaskStatement({
          coverImageDeletingTaskR2FilenameEq: coverImageR2Filename,
        }),
        ...(oldCoverImageR2Filename
          ? [
              insertCoverImageDeletingTaskStatement({
                r2Filename: oldCoverImageR2Filename,
                retryCount: 0,
                executionTimeMs: now,
                createdTimeMs: now,
              }),
            ]
          : []),
      ]);
      await transaction.commit();
    });
  }
}
