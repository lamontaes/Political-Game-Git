/**
 * A span of days as people say it (`data/english/span-words.json`): "three
 * months", "a year and a half", "about thirty years", never a day count.
 * Callers pass the number of days. A year or less is told in months; longer
 * spans in years, so a journal of a long life does not open every line with
 * the same "more than a year" (owner, Nov 8 playtest).
 */
import data from "../../data/english/span-words.json" with { type: "json" };

const YEARS = data.years as Readonly<Record<string, string>>;
const ABOUT = data.aboutYears as Readonly<Record<string, string>>;
const FIVES = Object.keys(ABOUT)
  .map(Number)
  .sort((a, b) => a - b);

/** A span of days: months up to a year, then "a year", "two years", "about thirty years". */
export function spanSaid(days: number): string {
  const months = Math.round(days / data.daysPerMonth.value);
  if (months < data.months.length) return data.months[Math.max(0, months)]!;
  const years = days / data.daysPerYear.value;
  const halves = Math.round(years * 2);
  if (halves < 3) return data.aYear;
  if (halves < 4) return data.aYearAndAHalf;
  const whole = Math.round(years);
  const named = YEARS[String(whole)];
  if (named) return named;
  const five = FIVES.find((n) => whole < n + 2.5);
  const nearest = five ?? FIVES[FIVES.length - 1]!;
  return whole >= FIVES[FIVES.length - 1]! + 2.5
    ? data.longer
    : ABOUT[String(nearest)]!;
}

/** A span of years said again after its first mention ("those years"). */
export function spanAgain(): string {
  return data.again;
}
