import "../env_const";
import "@phading/cluster/dev/env";
import { ENV_VARS } from "../env_vars";

ENV_VARS.spannerInstanceId = ENV_VARS.balancedSpannerInstanceId;
ENV_VARS.r2SeasonCoverImageBucketName = "season-cover-image-dev";
ENV_VARS.r2SeasonCoverImagePublicAccessOrigin =
  "https://season-cover-image-dev.secount.com";
ENV_VARS.r2VideoPublicAccessOrigin = "https://video-dev.secount.com";
ENV_VARS.replicas = 1;
ENV_VARS.cpu = "400m";
ENV_VARS.memory = "512Mi";
