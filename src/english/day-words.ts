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
