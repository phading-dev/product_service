import "../env_const";
import "@phading/cluster/dev/env";
import { ENV_VARS } from "../env_vars";

ENV_VARS.spannerInstanceId = ENV_VARS.balancedSpannerInstanceId;
ENV_VARS.r2SeasonCoverImageBucketName = "season-cover-image-dev";
ENV_VARS.r2SeasonCoverImagePublicAccessDomain =
  "season-cover-image-dev.phading.org";
ENV_VARS.r2VideoPublicAccessDomain = "video-dev.phading.org";
