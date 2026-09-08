/**
 * Real days, as opposed to date-shaped strings.
 *
 * `/^\d{4}-\d{2}-\d{2}$/` accepts "2022-02-30" and "2021-06-31", neither of
 * which is a day. A sourced value carries `asOf` so a reader can place it in
 * time; dating one to a day that never happened places it nowhere while looking
 * like it placed it somewhere, which is worse than leaving it unresolved.
 *
 * So every date this substrate admits is round-tripped through the calendar:
 * parsed as UTC, then checked component-by-component against what came back, so
 * that JavaScript's habit of rolling February 30th forward into March cannot
 * quietly turn a malformed date into a plausible one.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Whether a string is an ISO-8601 date naming a day that actually exists. */
export function isCalendarDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return (
    parsed.getUTCFullYear() === Number(year) &&
    parsed.getUTCMonth() + 1 === Number(month) &&
    parsed.getUTCDate() === Number(day)
  );
}

/** The four-digit calendar year of a date already known to be well-formed. */
export function calendarYearOf(value: string): number | null {
  return isCalendarDate(value) ? Number(value.slice(0, 4)) : null;
}
