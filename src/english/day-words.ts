/**
 * A day named at the start of a scene (`data/english/day-words.json`): "First
 * thing on June 7th", "On the afternoon of March 3rd". The date has no year;
 * the part of the day comes from the minute.
 */
import data from "../../data/english/day-words.json" with { type: "json" };

/** "7th", "21st", "12th": the day of the month with its ordinal. */
export function ordinalDay(day: number): string {
  const teen = day % 100 >= 11 && day % 100 <= 13;
  const last = day % 10;
  const suffix = teen
    ? data.ordinals.teens
    : last === 1
      ? data.ordinals.one
      : last === 2
        ? data.ordinals.two
        : last === 3
          ? data.ordinals.three
          : data.ordinals.other;
  return `${day}${suffix}`;
}

/** The date alone, as people say it in passing: "June 7th". */
export function dateSaid(iso: string): string {
  const month = data.months[Number(iso.slice(5, 7)) - 1];
  return month ? `${month} ${ordinalDay(Number(iso.slice(8, 10)))}` : iso;
}

/** The day as a scene opens on it: "First thing on June 7th". */
export function dayOpening(iso: string, minuteOfDay: number): string {
  const part =
    data.parts.find(
      (row) => row.upToMinute === null || minuteOfDay < row.upToMinute,
    ) ?? data.parts[data.parts.length - 1]!;
  return part.said.replace("{date}", dateSaid(iso));
}

/**
 * The day as the opening's landing names it, after "It's": "the evening of
 * January 20", "late on January 20" (the date with no ordinal; Words lead,
 * Nov 14), the part by the minute the player lands.
 */
export function dayLanding(iso: string, minuteOfDay: number): string {
  const rows = data.landing.parts;
  const part =
    rows.find(
      (row) => row.upToMinute === null || minuteOfDay < row.upToMinute,
    ) ?? rows[rows.length - 1]!;
  const month = data.months[Number(iso.slice(5, 7)) - 1] ?? iso;
  return part.said.replace("{date}", `${month} ${Number(iso.slice(8, 10))}`);
}

/**
 * A record's own day told as past from the day a scene plays: "yesterday",
 * "the other day", "on January 3rd", and for a day in another year "last
 * February" or "in February 2023". Null on the same day, or for a later one.
 */
export function daySince(recordIso: string, playIso: string): string | null {
  const day = 24 * 60 * 60 * 1000;
  const days = Math.round(
    (Date.parse(`${playIso.slice(0, 10)}T00:00:00Z`) -
      Date.parse(`${recordIso.slice(0, 10)}T00:00:00Z`)) /
      day,
  );
  if (!(days > 0)) return null;
  const row =
    data.since.find(
      (entry) => entry.upToDays === null || days <= entry.upToDays,
    ) ?? data.since[data.since.length - 1]!;
  // A bare month and day means this year (Fable A, Nov 13, rule 3): a day
  // in another year is told with its year, "last February" for the year
  // before.
  if (row.said.includes("{date}")) {
    const years = Number(playIso.slice(0, 4)) - Number(recordIso.slice(0, 4));
    if (years > 0)
      return (
        years === 1 ? data.sinceOtherYear.lastYear : data.sinceOtherYear.earlier
      )
        .replace("{month}", data.months[Number(recordIso.slice(5, 7)) - 1]!)
        .replace("{year}", recordIso.slice(0, 4));
  }
  const weekday =
    data.weekdays[new Date(`${recordIso.slice(0, 10)}T00:00:00Z`).getUTCDay()]!;
  return row.said
    .replace("{weekday}", weekday)
    .replace("{date}", dateSaid(recordIso));
}

/**
 * The month a record began, said after "since" ("since March", "since last
 * March", "since March 2023"); never a date.
 */
export function sinceMonthSaid(recordIso: string, playIso: string): string {
  const month = data.months[Number(recordIso.slice(5, 7)) - 1]!;
  const years = Number(playIso.slice(0, 4)) - Number(recordIso.slice(0, 4));
  if (years <= 0) return month;
  return (
    years === 1 ? data.sinceOtherYear.lastYear : data.sinceOtherYear.earlier
  )
    .replace("{month}", month)
    .replace("{year}", recordIso.slice(0, 4));
}

/**
 * A later day said from the day a scene plays: its weekday within the next
 * six days ("Friday"), else its date ("June 7th"). Null on the same day or
 * an earlier one, so a promise never names a day already here (Fable A, Nov
 * 13, rule 22).
 */
export function dayAhead(targetIso: string, playIso: string): string | null {
  const day = 24 * 60 * 60 * 1000;
  const days = Math.round(
    (Date.parse(`${targetIso.slice(0, 10)}T00:00:00Z`) -
      Date.parse(`${playIso.slice(0, 10)}T00:00:00Z`)) /
      day,
  );
  if (!(days > 0)) return null;
  return days < data.weekdays.length
    ? data.weekdays[
        new Date(`${targetIso.slice(0, 10)}T00:00:00Z`).getUTCDay()
      ]!
    : dateSaid(targetIso);
}

/**
 * A day ahead as said when asking someone along: "tonight" or "today" on the
 * same day, "tomorrow night" or "tomorrow" on the next (night when the thing
 * starts in the evening), else "on" and `dayAhead`'s day. Null for a day
 * already past.
 */
export function dayAheadSaid(
  targetIso: string,
  playIso: string,
  evening: boolean,
): string | null {
  const day = targetIso.slice(0, 10);
  const today = playIso.slice(0, 10);
  if (day === today) return evening ? data.ahead.tonight : data.ahead.today;
  const next = new Date(Date.parse(`${today}T00:00:00Z`) + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  if (day === next)
    return evening ? data.ahead.tomorrowNight : data.ahead.tomorrow;
  const on = dayAhead(day, today);
  return on ? data.ahead.on.replace("{day}", on) : null;
}

/** Whether a later day falls in the calendar month after the day a scene plays. */
export function inNextMonth(targetIso: string, playIso: string): boolean {
  const months =
    (Number(targetIso.slice(0, 4)) - Number(playIso.slice(0, 4))) * 12 +
    Number(targetIso.slice(5, 7)) -
    Number(playIso.slice(5, 7));
  return months === 1;
}
