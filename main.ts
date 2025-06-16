import http = require("http");
import { initS3Client } from "./common/s3_client";
import { ENV_VARS } from "./env_vars";
import { CacheVideoContainerHandler } from "./show/node/cache_video_container_handler";
import { CheckPresenceOfEpisodeHandler } from "./show/node/check_presence_of_episode_handler";
import { CheckPresenceOfSeasonHandler } from "./show/node/check_presence_of_season_handler";
import { GetSeasonGradeHandler } from "./show/node/get_season_grade_handler";
import { GetSeasonPublisherHandler } from "./show/node/get_season_publisher_handler";
import { ListCoverImageDeletingTasksHandler } from "./show/node/list_cover_image_deleting_tasks_handler";
import { ListSeasonRecentPremiereTimeUpdatingTaskHandler } from "./show/node/list_season_recent_premiere_time_updating_task_handler";
import { ListVideoContainerDeletingTasksHandler } from "./show/node/list_video_container_deleting_tasks_handler";
import { ProcessCoverImageDeletingTaskHandler } from "./show/node/process_cover_image_deleting_task_handler";
import { ProcessSeasonRecentPremiereTimeUpdatingTaskHandler } from "./show/node/process_season_recent_premiere_time_updating_handler";
import { ProcessVideoContainerDeletingTaskHandler } from "./show/node/process_video_container_deleting_task_handler";
import { AuthorizeEpisodePlaybackHandler } from "./show/web/consumer/authorize_episode_playback_handler";
import { GetContinueEpisodeHandler } from "./show/web/consumer/get_continue_episode_handler";
import { GetEpisodeHandler as ConsumerGetEpisodeHandler } from "./show/web/consumer/get_episode_handler";
import { GetEpisodeWithSeasonSummaryHandler } from "./show/web/consumer/get_episode_with_season_summary_handler";
import { GetIndividualSeasonRatingHandler } from "./show/web/consumer/get_individual_season_rating_handler";
import { GetSeasonDetailsHandler } from "./show/web/consumer/get_season_details_handler";
import { GetSeasonNameHandler } from "./show/web/consumer/get_season_name_handler";
import { GetSeasonSummaryHandler } from "./show/web/consumer/get_season_summary_handler";
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
import { CancelUploadingHandler } from "./show/web/publisher/cancel_uploading_handler";
import { CommitEpisodeStagingDataHandler } from "./show/web/publisher/commit_episode_staging_data_handler";
import { CompleteUploadingHandler } from "./show/web/publisher/complete_uploading_handler";
import { CreateEpisodeHandler } from "./show/web/publisher/create_episode_handler";
import { CreateSeasonHandler } from "./show/web/publisher/create_season_handler";
import { DeleteEpisodeHandler } from "./show/web/publisher/delete_episode_handler";
import { DeleteNextSeasonGradeHandler } from "./show/web/publisher/delete_next_season_grade_handler";
import { DeleteSeasonHandler } from "./show/web/publisher/delete_season_handler";
import { GetEpisodeHandler as PublisherGetEpisodeHandler } from "./show/web/publisher/get_episode_handler";
import { GetSeasonHandler } from "./show/web/publisher/get_season_handler";
import { ListDraftEpisodesHandler } from "./show/web/publisher/list_draft_episodes_handler";
import { ListPublishedEpisodesHandler } from "./show/web/publisher/list_published_episodes_handler";
import { ListSeasonsHandler } from "./show/web/publisher/list_seasons_handler";
import { PublishEpisodeHandler } from "./show/web/publisher/publish_episode_handler";
import { SaveEpisodeStagingDataHandler } from "./show/web/publisher/save_episode_staging_data_handler";
import { SearchSeasonsHandler as SearchSeasonsForPublisherHandler } from "./show/web/publisher/search_seasons_handler";
import { StartUploadingHandler } from "./show/web/publisher/start_uploading_handler";
import { UnpublishEpisodeHandler } from "./show/web/publisher/unpublish_episode_handler";
import { UpdateEpisodeIndexHandler } from "./show/web/publisher/update_episode_index_handler";
import { UpdateEpisodeNameHandler } from "./show/web/publisher/update_episode_name_handler";
import { UpdateEpisodePremiereTimeHandler } from "./show/web/publisher/update_episode_premiere_time_handler";
import { UpdateNextSeasonGradeHandler } from "./show/web/publisher/update_next_season_grade_handler";
import { UpdateSeasonGradeHandler } from "./show/web/publisher/update_season_grade_handler";
import { UpdateSeasonHandler } from "./show/web/publisher/update_season_handler";
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
    .add(CacheVideoContainerHandler.create())
    .add(CheckPresenceOfEpisodeHandler.create())
    .add(CheckPresenceOfSeasonHandler.create())
    .add(GetSeasonGradeHandler.create())
    .add(GetSeasonPublisherHandler.create())
    .add(ListCoverImageDeletingTasksHandler.create())
    .add(ListSeasonRecentPremiereTimeUpdatingTaskHandler.create())
    .add(ListVideoContainerDeletingTasksHandler.create())
    .add(ProcessCoverImageDeletingTaskHandler.create())
    .add(ProcessSeasonRecentPremiereTimeUpdatingTaskHandler.create())
    .add(ProcessVideoContainerDeletingTaskHandler.create());
  service
    .addHandlerRegister(PRODUCT_WEB_SERVICE)
    .add(AuthorizeEpisodePlaybackHandler.create())
    .add(GetContinueEpisodeHandler.create())
    .add(ConsumerGetEpisodeHandler.create())
    .add(GetEpisodeWithSeasonSummaryHandler.create())
    .add(GetIndividualSeasonRatingHandler.create())
    .add(GetSeasonDetailsHandler.create())
    .add(GetSeasonNameHandler.create())
    .add(GetSeasonSummaryHandler.create())
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
    .add(CancelUploadingHandler.create())
    .add(CommitEpisodeStagingDataHandler.create())
    .add(CompleteUploadingHandler.create())
    .add(CreateEpisodeHandler.create())
    .add(CreateSeasonHandler.create())
    .add(DeleteEpisodeHandler.create())
    .add(DeleteNextSeasonGradeHandler.create())
    .add(DeleteSeasonHandler.create())
    .add(PublisherGetEpisodeHandler.create())
    .add(GetSeasonHandler.create())
    .add(ListDraftEpisodesHandler.create())
    .add(ListPublishedEpisodesHandler.create())
    .add(ListSeasonsHandler.create())
    .add(PublishEpisodeHandler.create())
    .add(SaveEpisodeStagingDataHandler.create())
    .add(SearchSeasonsForPublisherHandler.create())
    .add(StartUploadingHandler.create())
    .add(UnpublishEpisodeHandler.create())
    .add(UpdateEpisodeIndexHandler.create())
    .add(UpdateEpisodeNameHandler.create())
    .add(UpdateEpisodePremiereTimeHandler.create())
    .add(UpdateNextSeasonGradeHandler.create())
    .add(UpdateSeasonGradeHandler.create())
    .add(UpdateSeasonHandler.create())
    .add(UploadCoverImageHandler.create());
  await service.start(ENV_VARS.port);
}

main();
