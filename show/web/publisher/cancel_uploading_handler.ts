import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { VideoContainerActionHandler } from "./common/video_container_action_handler";
import { Database } from "@google-cloud/spanner";
import { CancelUploadingHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  CancelUploadingRequestBody,
  CancelUploadingResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newCancelUploadingRequest } from "@phading/video_service_interface/node/client";
import { NodeServiceClient } from "@selfage/node_service_client";

export class CancelUploadingHandler extends CancelUploadingHandlerInterface {
  public static create(): CancelUploadingHandler {
    return new CancelUploadingHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
    body: CancelUploadingRequestBody,
    sessionStr: string,
  ): Promise<CancelUploadingResponse> {
    await this.videoContainerActionHandler.handle(
      loggingPrefix,
      body.seasonId,
      body.episodeId,
      sessionStr,
      (containerId) =>
        newCancelUploadingRequest({
          containerId,
        }),
    );
    return {};
  }
}
