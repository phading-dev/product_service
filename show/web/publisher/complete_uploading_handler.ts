import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { VideoContainerActionHandler } from "./common/video_container_action_handler";
import { Database } from "@google-cloud/spanner";
import { CompleteUploadingHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  CompleteUploadingRequestBody,
  CompleteUploadingResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newCompleteUploadingRequest } from "@phading/video_service_interface/node/client";
import { newBadRequestError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class CompleteUploadingHandler extends CompleteUploadingHandlerInterface {
  public static create(): CompleteUploadingHandler {
    return new CompleteUploadingHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
    body: CompleteUploadingRequestBody,
    sessionStr: string,
  ): Promise<CompleteUploadingResponse> {
    if (!body.uploadSessionUrl) {
      throw newBadRequestError(`"uploadSessionUrl" is required.`);
    }
    await this.videoContainerActionHandler.handle(
      loggingPrefix,
      body.seasonId,
      body.episodeId,
      sessionStr,
      (containerId) =>
        newCompleteUploadingRequest({
          containerId,
          uploadSessionUrl: body.uploadSessionUrl,
        }),
    );
    return {};
  }
}
