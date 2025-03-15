import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { VideoContainerActionHandler } from "./common/video_container_action_handler";
import { Database } from "@google-cloud/spanner";
import { CompleteMediaUploadingHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  CompleteMediaUploadingRequestBody,
  CompleteMediaUploadingResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newCompleteMediaUploadingRequest } from "@phading/video_service_interface/node/client";
import { newBadRequestError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class CompleteMediaUploadingHandler extends CompleteMediaUploadingHandlerInterface {
  public static create(): CompleteMediaUploadingHandler {
    return new CompleteMediaUploadingHandler(
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
    body: CompleteMediaUploadingRequestBody,
    sessionStr: string,
  ): Promise<CompleteMediaUploadingResponse> {
    if (!body.uploadSessionUrl) {
      throw newBadRequestError(`"uploadSessionUrl" is required.`);
    }
    await this.videoContainerActionHandler.handle(
      loggingPrefix,
      body.seasonId,
      body.episodeId,
      sessionStr,
      (containerId) =>
        newCompleteMediaUploadingRequest({
          containerId,
          uploadSessionUrl: body.uploadSessionUrl,
        }),
    );
    return {};
  }
}
