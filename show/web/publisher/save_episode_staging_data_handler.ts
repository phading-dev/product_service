import { SERVICE_CLIENT } from "../../../common/service_client";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import { VideoContainerActionHandler } from "./common/video_container_action_handler";
import { Database } from "@google-cloud/spanner";
import { SaveEpisodeStagingDataHandlerInterface } from "@phading/product_service_interface/show/web/publisher/handler";
import {
  SaveEpisodeStagingDataRequestBody,
  SaveEpisodeStagingDataResponse,
} from "@phading/product_service_interface/show/web/publisher/interface";
import { newSaveVideoContainerStagingDataRequest } from "@phading/video_service_interface/node/client";
import { NodeServiceClient } from "@selfage/node_service_client";

export class SaveEpisodeStagingDataHandler extends SaveEpisodeStagingDataHandlerInterface {
  public static create(): SaveEpisodeStagingDataHandler {
    return new SaveEpisodeStagingDataHandler(
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
    body: SaveEpisodeStagingDataRequestBody,
    sessionStr: string,
  ): Promise<SaveEpisodeStagingDataResponse> {
    let { error } = await this.videoContainerActionHandler.handle(
      loggingPrefix,
      body.seasonId,
      body.episodeId,
      sessionStr,
      (containerId) =>
        newSaveVideoContainerStagingDataRequest({
          containerId,
          videoContainer: body.videoContainer,
        }),
    );
    return {
      error,
    };
  }
}
