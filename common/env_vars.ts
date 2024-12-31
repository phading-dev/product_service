import { getEnvVar } from "@selfage/env_var_getter";

export let PROJECT_ID = getEnvVar("PROJECT_ID").required().asString();
export let INSTANCE_ID = getEnvVar("INSTANCE_ID").required().asString();
export let DATABASE_ID = getEnvVar("DATABASE_ID").required().asString();
export let SEASON_COVER_IMAGE_BUCKET_NAME = getEnvVar(
  "SEASON_COVER_IMAGE_BUCKET_NAME",
)
  .required()
  .asString();
export let CLOUDFLARE_ACCOUNT_ID = getEnvVar("CLOUDFLARE_ACCOUNT_ID")
  .required()
  .asString();
export let CLOUDFLARE_R2_ACCESS_KEY_ID = getEnvVar(
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
)
  .required()
  .asString();
export let CLOUDFLARE_R2_SECRET_ACCESS_KEY = getEnvVar(
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
)
  .required()
  .asString();
// Includes https:// but no trailing slash.
export let COVER_IMAGE_PUBLIC_ACCESS_DOMAIN = getEnvVar(
  "COVER_IMAGE_PUBLIC_ACCESS_DOMAIN",
)
  .required()
  .asString();
export let VIDEO_PUBLIC_ACCESS_DOMAIN = getEnvVar("VIDEO_PUBLIC_ACCESS_DOMAIN")
  .required()
  .asString();
