import { CLUSTER_ENV_VARS, ClusterEnvVars } from "@phading/cluster/env_vars";

export interface EnvVars extends ClusterEnvVars {
  spannerInstanceId?: string;
  spannerDatabaseId?: string;
  r2SeasonCoverImageBucketName?: string;
  // Without the trailing slash.
  r2SeasonCoverImagePublicAccessOrigin?: string;
  r2VideoPublicAccessOrigin?: string;
  releaseServiceName?: string;
  port?: number;
  builderAccount?: string;
  serviceAccount?: string;
  replicas?: number;
  cpu?: string;
  memory?: string;
}

export let ENV_VARS: EnvVars = CLUSTER_ENV_VARS;
