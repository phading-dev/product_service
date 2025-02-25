import { ENV_VARS } from "../env";

export function toTodaISOString(date: Date): string {
  if (date.getUTCHours() < ENV_VARS.timezoneNegativeOffset) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  let year = date.getUTCFullYear().toString().padStart(4, "0");
  let month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  let day = date.getUTCDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toDateUtc(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}
