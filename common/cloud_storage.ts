import {
  EPISODE_VIDEO_BUCKET_NAME,
  PROJECT_ID,
  SEASON_COVER_IMAGE_BUCKET_NAME,
} from "./env_variables";
import { Storage } from "@google-cloud/storage";

export let EPISODE_VIDEO_BUCKET = new Storage({
  projectId: PROJECT_ID,
}).bucket(EPISODE_VIDEO_BUCKET_NAME);
export let SEASON_COVER_IMAGE_BUCKET = new Storage({
  projectId: PROJECT_ID,
}).bucket(SEASON_COVER_IMAGE_BUCKET_NAME);
