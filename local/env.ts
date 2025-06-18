import "../env_const";
import "@phading/cluster/dev/env";
import { ENV_VARS } from "../env_vars";

ENV_VARS.spannerInstanceId = "test";
ENV_VARS.r2SeasonCoverImageBucketName = "season-cover-image-test";
ENV_VARS.r2SeasonCoverImagePublicAccessOrigin =
  "https://season-cover-image-dev.secount.com";
ENV_VARS.r2VideoPublicAccessOrigin = "https://video-dev.secount.com";
