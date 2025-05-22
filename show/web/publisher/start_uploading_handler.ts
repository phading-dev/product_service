import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { VideoContainerActionHandler } from "./common/video_container_action_handler";
import { Database } from "@google-cloud/spanner";
import { StartUploadingHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  StartUploadingRequestBody,
  StartUploadingResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newStartUploadingRequest } from "@phading/video_service_interface/node/client";
import { newBadRequestError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class StartUploadingHandler extends StartUploadingHandlerInterface {
  public static create(): StartUploadingHandler {
    return new StartUploadingHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
      Date.now(),
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
    body: StartUploadingRequestBody,
    sessionStr: string,
  ): Promise<StartUploadingResponse> {
    if (!body.contentLength) {
      throw newBadRequestError(`"contentLength" is required.`);
    }
    if (!body.fileExt) {
      throw newBadRequestError(`"fileExt" is required.`);
    }
    if (!body.md5) {
      throw newBadRequestError(`"md5" is required.`);
    }
    let { uploadSessionUrl, byteOffset } =
      await this.videoContainerActionHandler.handle(
        loggingPrefix,
        body.seasonId,
        body.episodeId,
        sessionStr,
        (containerId) =>
          newStartUploadingRequest({
            containerId,
            contentLength: body.contentLength,
            fileExt: body.fileExt,
            md5: body.md5,
          }),
      );
    return {
      uploadSessionUrl,
      byteOffset,
    };
  }
}
