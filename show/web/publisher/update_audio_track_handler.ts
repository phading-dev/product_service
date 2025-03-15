import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { VideoContainerActionHandler } from "./common/video_container_action_handler";
import { Database } from "@google-cloud/spanner";
import { MAX_AUDIO_TRACK_NAME_LENGTH } from "@phading/constants/show";
import { UpdateAudioTrackHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  UpdateAudioTrackRequestBody,
  UpdateAudioTrackResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newUpdateAudioTrackRequest } from "@phading/video_service_interface/node/client";
import { newBadRequestError } from "@selfage/http_error";
import { NodeServiceClient } from "@selfage/node_service_client";

export class UpdateAudioTrackHandler extends UpdateAudioTrackHandlerInterface {
  public static create(): UpdateAudioTrackHandler {
    return new UpdateAudioTrackHandler(SPANNER_DATABASE, SERVICE_CLIENT, () =>
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
    body: UpdateAudioTrackRequestBody,
    sessionStr: string,
  ): Promise<UpdateAudioTrackResponse> {
    if (!body.r2TrackDirname) {
      throw newBadRequestError(`"r2TrackDirname" is required.`);
    }
    if (!body.name) {
      throw newBadRequestError(`"name" is required.`);
    }
    if (body.name.length > MAX_AUDIO_TRACK_NAME_LENGTH) {
      throw newBadRequestError(`"name" is too long.`);
    }
    if (body.isDefault == null) {
      throw newBadRequestError(`"isDefault" is required.`);
    }
    await this.videoContainerActionHandler.handle(
      loggingPrefix,
      body.seasonId,
      body.episodeId,
      sessionStr,
      (containerId) =>
        newUpdateAudioTrackRequest({
          containerId,
          r2TrackDirname: body.r2TrackDirname,
          name: body.name,
          isDefault: body.isDefault,
        }),
    );
    return {};
  }
}
