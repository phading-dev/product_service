import {
  getSeasonForPublisher,
  updateSeasonStatement,
} from "../../../../db/sql";
import { Database } from "@google-cloud/spanner";
import { newNotFoundError } from "@selfage/http_error";

export async function updateSeasonLastChangeTime(
  database: Database,
  publisherId: string,
  seasonId: string,
  now: number,
): Promise<void> {
  await database.runTransactionAsync(async (transaction) => {
    let rows = await getSeasonForPublisher(transaction, publisherId, seasonId);
    if (rows.length === 0) {
      throw newNotFoundError(`Season ${seasonId} is not found.`);
    }
    let { seasonData } = rows[0];
    seasonData.lastChangeTimeMs = now;
    await transaction.batchUpdate([updateSeasonStatement(seasonData)]);
    await transaction.commit();
  });
}
