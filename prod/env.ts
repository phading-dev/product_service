import "../env_const";
import "@phading/cluster/prod/env";
import { ENV_VARS } from "../env_vars";

ENV_VARS.spannerInstanceId = ENV_VARS.balancedSpannerInstanceId;
ENV_VARS.r2SeasonCoverImageBucketName = "season-cover-image";
ENV_VARS.r2SeasonCoverImagePublicAccessOrigin =
  "https://season-cover-image.secount.com";
ENV_VARS.r2VideoPublicAccessOrigin = "https://video.secount.com";
ENV_VARS.replicas = 2;
ENV_VARS.cpu = "300m";
ENV_VARS.memory = "512Mi";
