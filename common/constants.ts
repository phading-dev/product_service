export let INSTANCE_ID = "core-services-instance";
export let DATABASE_ID = "product-service-db";
// TODO: Pass in fron arg/env.
export let EPISODE_VIDEO_BUCKET_NAME = "video-bucket";
export let SEASON_COVER_IMAGE_BUCKET_NAME = "season-cover-image";
export let COVER_IMAGE_HEIGHT = 300;
export let COVER_IMAGE_WIDTH = 200;
export let MAX_COVER_IMAGE_BUFFER_SIZE = 100 * 1024 * 1024; // 100 MB
export let EFFECTIVE_TIMESTAMP_GAP_MS = 24 * 60 * 60 * 1000;
export let FAR_FUTURE_TIME = new Date('9999-12-31').valueOf();
export let VIODE_EXPIRATION_MS = 24 * 60 * 60 * 1000;
