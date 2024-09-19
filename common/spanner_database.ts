import { DATABASE_ID, INSTANCE_ID } from "./constants";
import { Spanner } from "@google-cloud/spanner";

export let SPANNER_DATABASE = new Spanner()
  .instance(INSTANCE_ID)
  .database(DATABASE_ID);
