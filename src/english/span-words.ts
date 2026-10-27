/**
 * A span of days as people say it (`data/english/span-words.json`): "three
 * months", never a day count. Callers pass the number of days.
 */
import data from "../../data/english/span-words.json" with { type: "json" };

/** A span of days in months: "less than a month" through "more than a year". */
export function spanSaid(days: number): string {
  const months = Math.round(days / data.daysPerMonth.value);
  return months < data.months.length
    ? data.months[Math.max(0, months)]!
    : data.longer;
}
