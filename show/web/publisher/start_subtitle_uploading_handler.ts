import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { VideoContainerActionHandler } from "./common/video_container_action_handler";
import { Database } from "@google-cloud/spanner";
import { StartSubtitleUploadingHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  StartSubtitleUploadingRequestBody,
  StartSubtitleUploadingResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newStartSubtitleUploadingRequest } from "@phading/video_service_interface/node/client";
import { newBadRequestError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class StartSubtitleUploadingHandler extends StartSubtitleUploadingHandlerInterface {
  public static create(): StartSubtitleUploadingHandler {
    return new StartSubtitleUploadingHandler(
      SPANNER_DATABASE,
      SERVICE_CLIENT,
      () => Date.now(),
    );
  }

  private videoContainerActionHandler = new VideoContainerActionHandler(
    this.database,
    this.serviceClient,
    this.getNow,
  );

  public constructor(
    private database: Database,
    private serviceClient: NodeServiceClient,
    private getNow: () => number,
  ) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: StartSubtitleUploadingRequestBody,
    sessionStr: string,
  ): Promise<StartSubtitleUploadingResponse> {
    if (!body.contentLength) {
      throw newBadRequestError(`"contentLength" is required.`);
    }
    if (!body.fileType) {
      throw newBadRequestError(`"fileType" is required.`);
    }
    let { uploadSessionUrl, byteOffset } =
      await this.videoContainerActionHandler.handle(
        loggingPrefix,
        body.seasonId,
        body.episodeId,
        sessionStr,
        (containerId) =>
          newStartSubtitleUploadingRequest({
            containerId,
            contentLength: body.contentLength,
            fileType: body.fileType,
          }),
      );
    return {
      uploadSessionUrl,
      byteOffset,
    };
  }
}
