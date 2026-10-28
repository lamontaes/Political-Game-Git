// Dates, times and money as a reader says them: the one wording every screen uses
// (engine map line 19; duplicates report W8 and M9). Plain JavaScript so the play
// screen, served as it is written, imports it as the server's code does.

/** The day of an ISO date ("2025-01-20", or the date part of a longer stamp) at noon UTC. */
const noon = (iso) => new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);

/** The months' names, January first. */
export const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  new Date(Date.UTC(2000, i, 1)).toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  }),
);

/**
 * A day in words: "January 20, 2025". `weekday` says the day of the week first;
 * `month: "short"` says "Jan 20"; `year: false` leaves the year out, and `year` set to
 * today's ISO date says it only when the day falls in another year.
 */
export function dateWords(
  iso,
  { weekday = false, month = "long", year = true } = {},
) {
  const sayYear =
    typeof year === "string"
      ? String(iso).slice(0, 4) !== year.slice(0, 4)
      : year;
  return noon(iso).toLocaleDateString("en-US", {
    ...(weekday ? { weekday: "long" } : {}),
    month,
    day: "numeric",
    ...(sayYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

/** A month in words, "January 2025", from "2025-01" or a full date; "" when it is no date. */
export function monthWords(iso) {
  return /^\d{4}-\d{2}/.test(String(iso))
    ? noon(`${String(iso).slice(0, 7)}-15`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";
}

/** A time of day in words, "8:30 PM", from minutes after midnight. */
export function timeWords(minuteOfDay) {
  return new Date(
    Date.UTC(2000, 0, 1, Math.floor(minuteOfDay / 60), minuteOfDay % 60),
  ).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

const compactWords = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "long",
  maximumFractionDigits: 1,
});

/**
 * Money kept in cents, in words. A person's money to the cent: "$1,234.50". `rounded`
 * for a government's sums: whole dollars to three figures below a million ("$48,300",
 * "$12"), one decimal of a million, billion or trillion above ("$5.2 trillion").
 */
export function moneyWords(minor, { rounded = false } = {}) {
  if (!rounded)
    return (minor / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  const whole = Math.round(Math.abs(minor / 100));
  const sign = minor < 0 && whole > 0 ? "−" : "";
  return whole >= 1e6
    ? `${sign}$${compactWords.format(whole)}`
    : `${sign}$${Math.round(Number(whole.toPrecision(3))).toLocaleString("en-US")}`;
}
