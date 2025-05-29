import {
  MAX_AUDIO_TRACK_NAME_LENGTH,
  MAX_SUBTITLE_TRACK_NAME_LENGTH,
} from "@phading/constants/show";
import { VideoContainerStagingData } from "@phading/video_service_interface/node/video_container_staging_data";

export function normalizeVideoContainerStagingData(
  videoContainer: VideoContainerStagingData,
): void {
  if (!videoContainer.videos) {
    videoContainer.videos = [];
  }
  if (!videoContainer.audios) {
    videoContainer.audios = [];
  }
  videoContainer.audios.forEach((audio, index) => {
    if (audio.staging.toAdd) {
      if (!audio.staging.toAdd.name || audio.staging.toAdd.name.length === 0) {
        audio.staging.toAdd.name = index.toString();
      }
      if (audio.staging.toAdd.name.length > MAX_AUDIO_TRACK_NAME_LENGTH) {
        audio.staging.toAdd.name = audio.staging.toAdd.name.substring(
          0,
          MAX_AUDIO_TRACK_NAME_LENGTH,
        );
      }
    }
  });
  if (!videoContainer.subtitles) {
    videoContainer.subtitles = [];
  }
  videoContainer.subtitles.forEach((subtitle, index) => {
    if (subtitle.staging.toAdd) {
      if (
        !subtitle.staging.toAdd.name ||
        subtitle.staging.toAdd.name.length === 0
      ) {
        subtitle.staging.toAdd.name = index.toString();
      }
      if (subtitle.staging.toAdd.name.length > MAX_SUBTITLE_TRACK_NAME_LENGTH) {
        subtitle.staging.toAdd.name = subtitle.staging.toAdd.name.substring(
          0,
          MAX_SUBTITLE_TRACK_NAME_LENGTH,
        );
      }
    }
  });
}
