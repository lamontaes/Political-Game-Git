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

/** The part of the day as said in passing ("this morning", "tonight"), by the mark a scene's hour gives; undefined for a mark with no words. */
export function dayPartSaid(mark: string): string | undefined {
  const said = (data.spokenParts as Readonly<Record<string, string>>)[mark];
  return mark === "about" ? undefined : said;
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
