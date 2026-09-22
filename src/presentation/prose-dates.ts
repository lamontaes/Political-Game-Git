import type { IsoDate } from "../simulation";

/**
 * Dates as prose says them. The World stores ISO dates; a sentence a player
 * reads says "June 11, 2016" or "June 2016". Formatting goes through the
 * platform's English long-form so no month vocabulary lives in a template.
 */

// Reuse the fixed locale/UTC formatters, not a growing cache of saved dates.
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const MONTH_YEAR_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const WEEKDAY_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function utcDate(iso: IsoDate | string): Date | null {
  // Keep the existing date-prefix behavior for legacy timestamp callers.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Date.UTC remaps years 0–99 to 1900–1999. setUTCFullYear does not.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function proseDate(iso: IsoDate | string): string {
  const date = utcDate(iso);
  return date ? DATE_FORMAT.format(date) : iso;
}

export function proseMonthYear(iso: IsoDate | string): string {
  const date = utcDate(iso);
  return date ? MONTH_YEAR_FORMAT.format(date) : iso;
}

export function proseYear(iso: IsoDate | string): string {
  return utcDate(iso) ? iso.slice(0, 4) : iso;
}

/** "Tuesday, January 20, 2026": a date a skip or an event lands on. */
export function proseWeekdayDate(iso: IsoDate | string): string {
  const date = utcDate(iso);
  return date ? WEEKDAY_DATE_FORMAT.format(date) : iso;
}
