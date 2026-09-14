import type { IsoDate } from "../simulation";

/**
 * How calendar dates are shown. Storage stays ISO (`YYYY-MM-DD`).
 *
 * U.S. play defaults to month-then-day. Day-then-month is a display choice,
 * not a second clock.
 */
export type DateDisplayOrder = "mdy" | "dmy";

export const DEFAULT_DATE_DISPLAY_ORDER: DateDisplayOrder = "mdy";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const CALENDAR_MONTH_NAMES: readonly string[] = MONTH_NAMES;

export function parseIsoDateParts(date: IsoDate): {
  readonly year: number;
  readonly month: number;
  readonly day: number;
} {
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    day: Number(date.slice(8, 10)),
  };
}

/** Player-facing date. Never prints raw minute-of-day diagnostics. */
export function formatDisplayDate(
  date: IsoDate,
  order: DateDisplayOrder = DEFAULT_DATE_DISPLAY_ORDER,
): string {
  const { year, month, day } = parseIsoDateParts(date);
  const monthName = MONTH_NAMES[month - 1] ?? `Month ${month}`;
  if (order === "dmy") return `${day} ${monthName} ${year}`;
  return `${monthName} ${day}, ${year}`;
}

export function formatDisplayDateShort(
  date: IsoDate,
  order: DateDisplayOrder = DEFAULT_DATE_DISPLAY_ORDER,
): string {
  const { month, day } = parseIsoDateParts(date);
  if (order === "dmy") return `${day}/${month}`;
  return `${month}/${day}`;
}
