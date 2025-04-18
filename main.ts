import http = require("http");
import { initS3Client } from "./common/s3_client";
import { ENV_VARS } from "./env_vars";
import { CacheVideoContainer } from "./show/node/cache_video_container";
import { CheckPresenceOfEpisodeHandler } from "./show/node/check_presence_of_episode_handler";
import { CheckPresenceOfSeasonHandler } from "./show/node/check_presence_of_season_handler";
import { GetSeasonGradeHandler } from "./show/node/get_season_grade_handler";
import { GetSeasonPublisherHandler } from "./show/node/get_season_publisher_handler";
import { ListCoverImageDeletingTasksHandler } from "./show/node/list_cover_image_deleting_tasks_handler";
import { ListSeasonRecentPremiereTimeUpdatingTaskHandler } from "./show/node/list_season_recent_premiere_time_updating_task_handler";
import { ListVideoContainerCreatingTasksHandler } from "./show/node/list_video_container_creating_tasks_handler";
import { ListVideoContainerDeletingTasksHandler } from "./show/node/list_video_container_deleting_tasks_handler";
import { ProcessCoverImageDeletingTaskHandler } from "./show/node/process_cover_image_deleting_task_handler";
import { ProcessSeasonRecentPremiereTimeUpdatingTaskHandler } from "./show/node/process_season_recent_premiere_time_updating_handler";
import { ProcessVideoContainerCreatingTaskHandler } from "./show/node/process_video_container_creating_task_handler";
import { ProcessVideoContainerDeletingTaskHandler } from "./show/node/process_video_container_deleting_task_handler";
import { GetContinueEpisodeHandler } from "./show/web/consumer/get_continue_episode_handler";
import { GetEpisodeDetailsHandler } from "./show/web/consumer/get_episode_details_handler";
import { GetIndividualSeasonRatingHandler } from "./show/web/consumer/get_individual_season_rating_handler";
import { GetSeasonAndEpisodeSummaryHandler } from "./show/web/consumer/get_season_and_episode_summary_handler";
import { GetSeasonDetailsHandler } from "./show/web/consumer/get_season_details_handler";
import { GetSeasonNameHandler } from "./show/web/consumer/get_season_name_handler";
import { ListContinueWatchingSeasonsHandler } from "./show/web/consumer/list_continue_watching_seasons_handler";
import { ListEpisodesHandler as ListEpisodesForConsumerHandler } from "./show/web/consumer/list_episodes_handler";
import { ListSeasonsByRatingAndPublisherHandler } from "./show/web/consumer/list_seasons_by_rating_and_publisher_handler";
import { ListSeasonsByRatingHandler } from "./show/web/consumer/list_seasons_by_rating_handler";
import { ListSeasonsByRecentPremiereTimeAndPublisherHandler } from "./show/web/consumer/list_seasons_by_recent_premiere_time_and_publisher_handler";
import { ListSeasonsByRecentPremiereTimeHandler } from "./show/web/consumer/list_seasons_by_recent_premiere_time_handler";
import { RateSeasonHandler } from "./show/web/consumer/rate_season_handler";
import { SearchSeasonsHandler as SearchSeasonsForConsumerHandler } from "./show/web/consumer/search_seasons_handler";
import { UnrateSeasonHandler } from "./show/web/consumer/unrate_season_handler";
import { ArchiveSeasonHandler } from "./show/web/publisher/archive_season_handler";
import { CancelMediaFormattingHandler } from "./show/web/publisher/cancel_media_formatting_handler";
import { CancelMediaUploadingHandler } from "./show/web/publisher/cancel_media_uploading_handler";
import { CancelSubtitleFormattingHandler } from "./show/web/publisher/cancel_subtitle_formatting_handler";
import { CancelSubtitleUploadingHandler } from "./show/web/publisher/cancel_subtitle_uploading_handler";
import { CommitEpisodeStagingDataHandler } from "./show/web/publisher/commit_episode_staging_data_handler";
import { CompleteMediaUploadingHandler } from "./show/web/publisher/complete_media_uploading_handler";
import { CompleteSubtitleUploadingHandler } from "./show/web/publisher/complete_subtitle_uploading_handler";
import { CreateEpisodeHandler } from "./show/web/publisher/create_episode_handler";
import { CreateSeasonHandler } from "./show/web/publisher/create_season_handler";
import { DeleteAudioTrackHandler } from "./show/web/publisher/delete_audio_track_handler";
import { DeleteEpisodeHandler } from "./show/web/publisher/delete_episode_handler";
import { DeleteSeasonHandler } from "./show/web/publisher/delete_season_handler";
import { DeleteSubtitleTrackHandler } from "./show/web/publisher/delete_subtitle_track_handler";
import { DeleteVideoTrackHandler } from "./show/web/publisher/delete_video_track_handler";
import { DropAudioTrackStagingDataHandler } from "./show/web/publisher/drop_audio_track_staging_data_handler";
import { DropSubtitleTrackStagingDataHandler } from "./show/web/publisher/drop_subtitle_track_staging_data_handler";
import { DropVideoTrackStagingDataHandler } from "./show/web/publisher/drop_video_track_staging_data_handler";
import { GetEpisodeHandler } from "./show/web/publisher/get_episode_handler";
import { GetSeasonHandler } from "./show/web/publisher/get_season_handler";
import { ListEpisodesHandler as ListEpisodesForPublisherHandler } from "./show/web/publisher/list_episodes_handler";
import { ListSeasonsHandler } from "./show/web/publisher/list_seasons_handler";
import { PublishEpisodeHandler } from "./show/web/publisher/publish_episode_handler";
import { SearchSeasonsHandler as SearchSeasonsForPublisherHandler } from "./show/web/publisher/search_seasons_handler";
import { StartMediaUploadingHandler } from "./show/web/publisher/start_media_uploading_handler";
import { StartSubtitleUploadingHandler } from "./show/web/publisher/start_subtitle_uploading_handler";
import { UnpublishEpisodeHandler } from "./show/web/publisher/unpublish_episode_handler";
import { UpdateAudioTrackHandler } from "./show/web/publisher/update_audio_track_handler";
import { UpdateEpisodeHandler } from "./show/web/publisher/update_episode_handler";
import { UpdateEpisodeOrderHandler } from "./show/web/publisher/update_episode_order_handler";
import { UpdateSeasonGradeHandler } from "./show/web/publisher/update_season_grade_handler";
import { UpdateSeasonHandler } from "./show/web/publisher/update_season_handler";
import { UpdateSubtitleTrackHandler } from "./show/web/publisher/update_subtitle_track_handler";
import { UploadCoverImageHandler } from "./show/web/publisher/upload_cover_image_handler";
import {
  PRODUCT_NODE_SERVICE,
  PRODUCT_WEB_SERVICE,
} from "@phading/product_service_interface/service";
import { ServiceHandler } from "@selfage/service_handler/service_handler";

async function main() {
  await initS3Client();
  let service = ServiceHandler.create(
    http.createServer(),
    ENV_VARS.externalOrigin,
  )
    .addCorsAllowedPreflightHandler()
    .addHealthCheckHandler()
    .addReadinessHandler()
    .addMetricsHandler();
  service
    .addHandlerRegister(PRODUCT_NODE_SERVICE)
    .add(CacheVideoContainer.create())
    .add(CheckPresenceOfEpisodeHandler.create())
    .add(CheckPresenceOfSeasonHandler.create())
    .add(GetSeasonGradeHandler.create())
    .add(GetSeasonPublisherHandler.create())
    .add(ListCoverImageDeletingTasksHandler.create())
    .add(ListSeasonRecentPremiereTimeUpdatingTaskHandler.create())
    .add(ListVideoContainerCreatingTasksHandler.create())
    .add(ListVideoContainerDeletingTasksHandler.create())
    .add(ProcessCoverImageDeletingTaskHandler.create())
    .add(ProcessSeasonRecentPremiereTimeUpdatingTaskHandler.create())
    .add(ProcessVideoContainerCreatingTaskHandler.create())
    .add(ProcessVideoContainerDeletingTaskHandler.create());
  service
    .addHandlerRegister(PRODUCT_WEB_SERVICE)
    .add(GetContinueEpisodeHandler.create())
    .add(GetEpisodeDetailsHandler.create())
    .add(GetIndividualSeasonRatingHandler.create())
    .add(GetSeasonAndEpisodeSummaryHandler.create())
    .add(GetSeasonDetailsHandler.create())
    .add(GetSeasonNameHandler.create())
    .add(ListContinueWatchingSeasonsHandler.create())
    .add(ListEpisodesForConsumerHandler.create())
    .add(ListSeasonsByRatingAndPublisherHandler.create())
    .add(ListSeasonsByRatingHandler.create())
    .add(ListSeasonsByRecentPremiereTimeAndPublisherHandler.create())
    .add(ListSeasonsByRecentPremiereTimeHandler.create())
    .add(RateSeasonHandler.create())
    .add(SearchSeasonsForConsumerHandler.create())
    .add(UnrateSeasonHandler.create())
    .add(ArchiveSeasonHandler.create())
    .add(CancelMediaFormattingHandler.create())
    .add(CancelMediaUploadingHandler.create())
    .add(CancelSubtitleFormattingHandler.create())
    .add(CancelSubtitleUploadingHandler.create())
    .add(CommitEpisodeStagingDataHandler.create())
    .add(CompleteMediaUploadingHandler.create())
    .add(CompleteSubtitleUploadingHandler.create())
    .add(CreateEpisodeHandler.create())
    .add(CreateSeasonHandler.create())
    .add(DeleteAudioTrackHandler.create())
    .add(DeleteEpisodeHandler.create())
    .add(DeleteSeasonHandler.create())
    .add(DeleteSubtitleTrackHandler.create())
    .add(DeleteVideoTrackHandler.create())
    .add(DropAudioTrackStagingDataHandler.create())
    .add(DropSubtitleTrackStagingDataHandler.create())
    .add(DropVideoTrackStagingDataHandler.create())
    .add(GetEpisodeHandler.create())
    .add(GetSeasonHandler.create())
    .add(ListEpisodesForPublisherHandler.create())
    .add(ListSeasonsHandler.create())
    .add(PublishEpisodeHandler.create())
    .add(SearchSeasonsForPublisherHandler.create())
    .add(StartMediaUploadingHandler.create())
    .add(StartSubtitleUploadingHandler.create())
    .add(UnpublishEpisodeHandler.create())
    .add(UpdateAudioTrackHandler.create())
    .add(UpdateEpisodeHandler.create())
    .add(UpdateEpisodeOrderHandler.create())
    .add(UpdateSeasonGradeHandler.create())
    .add(UpdateSeasonHandler.create())
    .add(UpdateSubtitleTrackHandler.create())
    .add(UploadCoverImageHandler.create());
  await service.start(ENV_VARS.port);
}

main();
