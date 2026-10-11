// Lifted unchanged from src/simulation/nationwide-world/state-executive-term-rules.ts; RULES-3, 2026-10-11.

export type TermCommencementRule =
  /** January 1 of the year after the election. */
  | { readonly kind: "january-first-following-election" }
  /**
   * A fixed day of January in the year after the election, whatever weekday it
   * falls on. The District's Mayor takes office on January 2nd; a rule that
   * only knew how to count weekdays would have had to round that to something
   * the instrument does not say.
   */
  | {
      readonly kind: "january-fixed-day-following-election";
      readonly day: number;
    }
  /**
   * The `ordinal`-th `weekday` (0 = Sunday) of January in the year after the
   * election, then `offsetDays` later. Washington's "Wednesday after the second
   * Monday of January" is ordinal 2, weekday 1, offset 2.
   */
  | {
      readonly kind: "january-weekday-following-election";
      readonly ordinal: 1 | 2 | 3 | 4;
      readonly weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
      readonly offsetDays: number;
    }
  /**
   * The `ordinal`-th `weekday` of December in the election year itself, then
   * `offsetDays` later. Alaska and Hawaii seat their governors on the first
   * Monday of December, a month after the vote rather than in the new year.
   */
  | {
      readonly kind: "december-weekday-of-election-year";
      readonly ordinal: 1 | 2 | 3 | 4;
      readonly weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
      readonly offsetDays: number;
    };

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const ORDINAL_NAMES = ["first", "second", "third", "fourth"] as const;

export function dayOfMonth(day: number): string {
  if (day === 1) return "January 1st";
  if (day === 2) return "January 2nd";
  if (day === 3) return "January 3rd";
  return `January ${day}th`;
}

export function commencementDescription(rule: TermCommencementRule): string {
  if (rule.kind === "january-first-following-election") return "January 1st";
  if (rule.kind === "january-fixed-day-following-election")
    return dayOfMonth(rule.day);
  const month =
    rule.kind === "december-weekday-of-election-year" ? "December" : "January";
  const anchor = `the ${ORDINAL_NAMES[rule.ordinal - 1]} ${WEEKDAY_NAMES[rule.weekday]} of ${month}`;
  if (rule.offsetDays === 0) return anchor;
  const shifted = WEEKDAY_NAMES[(rule.weekday + rule.offsetDays) % 7];
  return `the ${shifted} after ${anchor}`;
}
