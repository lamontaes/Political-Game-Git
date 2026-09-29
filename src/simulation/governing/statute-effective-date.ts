import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { addDays, isoDateFromParts, yearOf } from "../dates";
import type { IsoDate } from "../types";

/**
 * When a state statute takes effect if the act names no date of its own, by
 * the state's own rule (`effectiveDates` in the starting-law file, read from
 * each state's constitution or code). A state the file leaves out has no
 * researched rule: the caller keeps its blanket default and says so.
 *
 * NOT MODELED: acts that set their own date, emergency clauses, appropriation
 * acts where a state dates them differently (Minnesota, Missouri, Ohio), and
 * special sessions (Missouri counts from the regular session's end). Rules
 * that count from an adjournment the law does not fix to a date (Texas,
 * Florida and most "ninety days after adjournment" states), from publication
 * (Kansas, Hawaii) or from Congress's review (D.C.) stay out of the file. A
 * rule written from passage or filing is counted from enactment, the one
 * date the game records, and its note says so.
 */
export type StatuteEffectiveRule =
  | { readonly kind: "days-after-enactment"; readonly days: number }
  | { readonly kind: "next-date"; readonly month: number; readonly day: number }
  | {
      /** The first of several yearly dates after the act (Georgia: July 1
       * for acts approved January to June, January 1 for the rest). */
      readonly kind: "next-of-dates";
      readonly dates: readonly {
        readonly month: number;
        readonly day: number;
      }[];
    }
  | {
      /** A date in the act's own year if the act comes before it, otherwise
       * a number of days after the act (North Dakota: August 1, or 90 days
       * after filing from August 1 on; Rhode Island: July 1, or at once). */
      readonly kind: "date-in-year-else-days";
      readonly month: number;
      readonly day: number;
      readonly lateDays: number;
    }
  | {
      readonly kind: "days-after-session-end";
      readonly days: number;
      readonly sessionEnds: { readonly month: number; readonly day: number };
    };

const RULES: Readonly<Record<string, { readonly rule: StatuteEffectiveRule }>> =
  (
    startingLaw as unknown as {
      readonly effectiveDates?: {
        readonly rules: Readonly<
          Record<string, { readonly rule: StatuteEffectiveRule }>
        >;
      };
    }
  ).effectiveDates?.rules ?? {};

/** The researched rule for a state (`US-XX`), or null where none is read. */
export function statuteEffectiveRule(
  jurisdictionKey: string,
): StatuteEffectiveRule | null {
  return Object.hasOwn(RULES, jurisdictionKey)
    ? RULES[jurisdictionKey]!.rule
    : null;
}

/**
 * The date a state statute enacted on `enactedAt` takes effect under its
 * state's rule, or null where the state's rule is not researched or does not
 * reach the act (a Missouri act passed after its regular session, which only
 * a special session can do).
 */
export function stateStatuteOperativeAt(
  jurisdictionKey: string,
  enactedAt: IsoDate,
): IsoDate | null {
  const rule = statuteEffectiveRule(jurisdictionKey);
  if (!rule) return null;
  const year = yearOf(enactedAt);
  switch (rule.kind) {
    case "days-after-enactment":
      return addDays(enactedAt, rule.days);
    case "next-date":
      // The first such date after the act: "the first day of June next".
      return nextYearlyDate(enactedAt, rule.month, rule.day);
    case "next-of-dates": {
      const candidates = rule.dates.map((date) =>
        nextYearlyDate(enactedAt, date.month, date.day),
      );
      return candidates.reduce((earliest, date) =>
        date < earliest ? date : earliest,
      );
    }
    case "date-in-year-else-days": {
      const thisYear = isoDateFromParts(year, rule.month, rule.day);
      return enactedAt < thisYear
        ? thisYear
        : addDays(enactedAt, rule.lateDays);
    }
    case "days-after-session-end": {
      // The regular session of the act's year. An act passed after that
      // date came from a special session, whose own adjournment the game
      // does not record, so the rule does not date it.
      const operative = addDays(
        isoDateFromParts(year, rule.sessionEnds.month, rule.sessionEnds.day),
        rule.days,
      );
      return operative > enactedAt ? operative : null;
    }
  }
}

/** The first `month`/`day` strictly after `from`. */
function nextYearlyDate(from: IsoDate, month: number, day: number): IsoDate {
  const thisYear = isoDateFromParts(yearOf(from), month, day);
  return thisYear > from
    ? thisYear
    : isoDateFromParts(yearOf(from) + 1, month, day);
}
