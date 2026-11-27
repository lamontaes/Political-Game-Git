/** Date steps for the group B reach review. */
import { reachParameter } from "./group-b-people";
import { lastDayOfMonth } from "../kernel/dates";

/** The date the review's cadence (months) after `date`, clamped to the month's end. */
export function addMonths(date: string): string {
  const months = reachParameter("reviewEveryMonths");
  const at = new Date(`${date}T00:00:00.000Z`);
  const year = at.getUTCFullYear();
  const month = at.getUTCMonth() + months;
  const last = lastDayOfMonth(year, month + 1);
  return new Date(Date.UTC(year, month, Math.min(at.getUTCDate(), last)))
    .toISOString()
    .slice(0, 10);
}
