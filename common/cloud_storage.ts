import {
  EPISODE_VIDEO_BUCKET_NAME,
  SEASON_COVER_IMAGE_BUCKET_NAME,
} from "./constants";
import { Storage } from "@google-cloud/storage";

export let EPISODE_VIDEO_BUCKET = new Storage().bucket(
  EPISODE_VIDEO_BUCKET_NAME,
);
export let SEASON_COVER_IMAGE_BUCKET = new Storage().bucket(
  SEASON_COVER_IMAGE_BUCKET_NAME,
);
