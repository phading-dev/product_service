import { ENV_VARS } from "./env";
import "./env_const";
import "@phading/cluster/env_dev";

ENV_VARS.spannerInstanceId = "test";
ENV_VARS.r2SeasonCoverImageBucketName = "season-cover-image-dev";
ENV_VARS.r2SeasonCoverImagePublicAccessDomain =
  "season-cover-image-dev.phading.org";
ENV_VARS.r2VideoPublicAccessDomain = "video-dev.phading.org";
