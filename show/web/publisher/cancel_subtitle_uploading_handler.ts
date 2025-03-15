import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { VideoContainerActionHandler } from "./common/video_container_action_handler";
import { Database } from "@google-cloud/spanner";
import { CancelSubtitleUploadingHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  CancelSubtitleUploadingRequestBody,
  CancelSubtitleUploadingResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newCancelSubtitleUploadingRequest } from "@phading/video_service_interface/node/client";
import { NodeServiceClient } from "@selfage/node_service_client";

export class CancelSubtitleUploadingHandler extends CancelSubtitleUploadingHandlerInterface {
  public static create(): CancelSubtitleUploadingHandler {
    return new CancelSubtitleUploadingHandler(
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
    body: CancelSubtitleUploadingRequestBody,
    sessionStr: string,
  ): Promise<CancelSubtitleUploadingResponse> {
    await this.videoContainerActionHandler.handle(
      loggingPrefix,
      body.seasonId,
      body.episodeId,
      sessionStr,
      (containerId) =>
        newCancelSubtitleUploadingRequest({
          containerId,
        }),
    );
    return {};
  }
}
