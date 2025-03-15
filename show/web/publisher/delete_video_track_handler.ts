import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { VideoContainerActionHandler } from "./common/video_container_action_handler";
import { Database } from "@google-cloud/spanner";
import { DeleteVideoTrackHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  DeleteVideoTrackRequestBody,
  DeleteVideoTrackResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newDeleteVideoTrackRequest } from "@phading/video_service_interface/node/client";
import { newBadRequestError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class DeleteVideoTrackHandler extends DeleteVideoTrackHandlerInterface {
  public static create(): DeleteVideoTrackHandler {
    return new DeleteVideoTrackHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
    body: DeleteVideoTrackRequestBody,
    sessionStr: string,
  ): Promise<DeleteVideoTrackResponse> {
    if (!body.r2TrackDirname) {
      throw newBadRequestError(`"r2TrackDirname" is required.`);
    }
    await this.videoContainerActionHandler.handle(
      loggingPrefix,
      body.seasonId,
      body.episodeId,
      sessionStr,
      (containerId) =>
        newDeleteVideoTrackRequest({
          containerId,
          r2TrackDirname: body.r2TrackDirname,
        }),
    );
    return {};
  }
}
