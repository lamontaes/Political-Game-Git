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
 * special sessions (Missouri counts from the regular session's end). A rule
 * that counts from an adjournment is dated only where the game records the
 * session's end (Kentucky's rule pack); the other "ninety days after
 * adjournment" states stay out of the file, as do rules counted from
 * publication (Kansas, Hawaii) or from Congress's review (D.C.). A rule
 * counted from final passage reads the passage date the enactment records
 * (Illinois). A rule written from filing is counted from enactment, and its
 * note says so.
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
    }
  | {
      /** The day after `days` full days have passed since the session the
       * act was introduced in closed, on the closing date the game records
       * (Kentucky: the day of adjournment is not counted, and the act takes
       * effect once the ninetieth day has passed). */
      readonly kind: "full-days-after-recorded-session-end";
      readonly days: number;
    }
  | {
      /** A date in the year after final passage, earlier for acts passed
       * before a cutoff in their year, and never before the act is law
       * (Illinois: January 1 for bills passed before June 1, June 1 for the
       * rest). */
      readonly kind: "next-year-date-by-passage";
      readonly cutoff: { readonly month: number; readonly day: number };
      readonly early: { readonly month: number; readonly day: number };
      readonly late: { readonly month: number; readonly day: number };
    }
  | {
      /** The first January 1 after `days` days have passed since the act
       * (California art. IV, sec. 8(c)(1)). With `oddYearsNextJanuary`, an
       * act of an odd year takes effect the next January 1: the first year
       * of California's two-year session ends in a joint recess, and a bill
       * passed before it and signed after it takes effect "January 1 next
       * following the enactment date" (sec. 8(c)(2)). */
      readonly kind: "january-after-days";
      readonly days: number;
      readonly oddYearsNextJanuary: boolean;
    };

/**
 * Dates from the act's own record that some rules count from, read only by
 * the rule that needs one. A rule whose date the caller does not have does
 * not date the act.
 */
export interface StatuteDateContext {
  /** The close of the regular session the act was introduced in, as the
   * game records it (`measureSessionClosedOn`). */
  readonly sessionClosedOn?: () => IsoDate | null;
  /** The legislature's final passing vote on the act. */
  readonly finalPassageAt?: () => IsoDate | null;
}

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
 * a special session can do), or where the rule counts from a date the act's
 * record does not carry.
 */
export function stateStatuteOperativeAt(
  jurisdictionKey: string,
  enactedAt: IsoDate,
  context: StatuteDateContext = {},
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
    case "full-days-after-recorded-session-end": {
      const closedOn = context.sessionClosedOn?.();
      if (!closedOn) return null;
      return latest(addDays(closedOn, rule.days + 1), enactedAt);
    }
    case "next-year-date-by-passage": {
      const passedAt = context.finalPassageAt?.();
      if (!passedAt) return null;
      const passedYear = yearOf(passedAt);
      const date =
        passedAt <
        isoDateFromParts(passedYear, rule.cutoff.month, rule.cutoff.day)
          ? rule.early
          : rule.late;
      return latest(
        isoDateFromParts(passedYear + 1, date.month, date.day),
        enactedAt,
      );
    }
    case "january-after-days":
      return rule.oddYearsNextJanuary && year % 2 === 1
        ? nextYearlyDate(enactedAt, 1, 1)
        : nextYearlyDate(addDays(enactedAt, rule.days), 1, 1);
  }
}

function latest(a: IsoDate, b: IsoDate): IsoDate {
  return a > b ? a : b;
}

/** The first `month`/`day` strictly after `from`. */
function nextYearlyDate(from: IsoDate, month: number, day: number): IsoDate {
  const thisYear = isoDateFromParts(yearOf(from), month, day);
  return thisYear > from
    ? thisYear
    : isoDateFromParts(yearOf(from) + 1, month, day);
}
