import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { VideoContainerActionHandler } from "./common/video_container_action_handler";
import { Database } from "@google-cloud/spanner";
import { MAX_SUBTITLE_TRACK_NAME_LENGTH } from "@phading/constants/show";
import { UpdateSubtitleTrackHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  UpdateSubtitleTrackRequestBody,
  UpdateSubtitleTrackResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newUpdateSubtitleTrackRequest } from "@phading/video_service_interface/node/client";
import { newBadRequestError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class UpdateSubtitleTrackHandler extends UpdateSubtitleTrackHandlerInterface {
  public static create(): UpdateSubtitleTrackHandler {
    return new UpdateSubtitleTrackHandler(
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
    body: UpdateSubtitleTrackRequestBody,
    sessionStr: string,
  ): Promise<UpdateSubtitleTrackResponse> {
    if (!body.r2TrackDirname) {
      throw newBadRequestError(`"r2TrackDirname" is required.`);
    }
    if (!body.name) {
      throw newBadRequestError(`"name" is required.`);
    }
    if (body.name.length > MAX_SUBTITLE_TRACK_NAME_LENGTH) {
      throw newBadRequestError(`"name" is too long.`);
    }
    await this.videoContainerActionHandler.handle(
      loggingPrefix,
      body.seasonId,
      body.episodeId,
      sessionStr,
      (containerId) =>
        newUpdateSubtitleTrackRequest({
          containerId,
          r2TrackDirname: body.r2TrackDirname,
          name: body.name,
        }),
    );
    return {};
  }
}
