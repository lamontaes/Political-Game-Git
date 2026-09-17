import type { IsoDate } from "../simulation";

/**
 * Dates as prose says them. The World stores ISO dates; a sentence a player
 * reads says "June 11, 2016" or "June 2016". Formatting goes through the
 * platform's English long-form so no month vocabulary lives in a template.
 */

function utcDate(iso: IsoDate | string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
}

export function proseDate(iso: IsoDate | string): string {
  const date = utcDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function proseMonthYear(iso: IsoDate | string): string {
  const date = utcDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function proseYear(iso: IsoDate | string): string {
  return iso.slice(0, 4);
}

/** "Tuesday, January 20, 2026": a date a skip or an event lands on. */
export function proseWeekdayDate(iso: IsoDate | string): string {
  const date = utcDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
