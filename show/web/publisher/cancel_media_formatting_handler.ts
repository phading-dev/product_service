import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { VideoContainerActionHandler } from "./common/video_container_action_handler";
import { Database } from "@google-cloud/spanner";
import { CancelMediaFormattingHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  CancelMediaFormattingRequestBody,
  CancelMediaFormattingResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newCancelMediaFormattingRequest } from "@phading/video_service_interface/node/client";
import { NodeServiceClient } from "@selfage/node_service_client";

export class CancelMediaFormattingHandler extends CancelMediaFormattingHandlerInterface {
  public static create(): CancelMediaFormattingHandler {
    return new CancelMediaFormattingHandler(
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
    body: CancelMediaFormattingRequestBody,
    sessionStr: string,
  ): Promise<CancelMediaFormattingResponse> {
    await this.videoContainerActionHandler.handle(
      loggingPrefix,
      body.seasonId,
      body.episodeId,
      sessionStr,
      (containerId) =>
        newCancelMediaFormattingRequest({
          containerId,
        }),
    );
    return {};
  }
}
