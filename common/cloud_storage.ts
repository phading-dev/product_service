import { PROJECT_ID } from "./env_variables";
import { Storage } from "@google-cloud/storage";
import { CloudStorageClient } from "@selfage/gcs_client";

export let STORAGE_CLIENT = new Storage({
  projectId: PROJECT_ID,
});
export let UPLOAD_CLIENT = CloudStorageClient.create(PROJECT_ID);
