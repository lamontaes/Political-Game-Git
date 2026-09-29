import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { addDays, isoDateFromParts, yearOf } from "../dates";
import type { IsoDate } from "../types";

/**
 * When a state statute takes effect if the act names no date of its own, by
 * the state's own rule (`effectiveDates` in the starting-law file, read from
 * each state's constitution or code). A rule marked `estimated` was not read
 * for that place: it is the most common rule among places like it, and says
 * which (ESTIMATED FROM AVERAGE). A place the file leaves out keeps the
 * caller's blanket default, which says so.
 *
 * A rule that counts from a session's end reads that end from one table for
 * every state (`sessionEnds`): the latest day the state's constitution or
 * statute lets its regular session run. Where a state sets no calendar
 * limit, the table's row is estimated from the states whose limit is read,
 * and says so. A rule counted from final passage reads the passage date the
 * enactment records (Illinois); one written from filing is counted from
 * enactment, and its note says so.
 *
 * NOT MODELED: acts that set their own date, emergency clauses, appropriation
 * acts where a state dates them differently (Minnesota, Missouri, Ohio), a
 * session that adjourns before its limit, and special sessions: an act
 * enacted after its regular session's rule would date it is left to the
 * caller's default.
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
      /** `days` after the last day of the act's regular session, as the
       * session-end table gives it. The count is each state's own: Missouri's
       * "ninety days after" lands on day 90 (August 28), Kentucky's on day
       * 91, because its Attorney General leaves out the day of adjournment
       * and waits for ninety full days (OAG 26-03). */
      readonly kind: "days-after-session-end";
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

/** A day of the year: a fixed date, or the `nth` `weekday` (0 is Sunday)
 * of a month, where `nth` -1 is the last one. */
export type YearlyDay =
  | { readonly month: number; readonly day: number }
  | {
      readonly month: number;
      readonly weekday: number;
      readonly nth: number;
    };

/** When a regular session must end in a year. */
export type SessionEndRule =
  | { readonly kind: "on"; readonly day: YearlyDay }
  | {
      /** A session limited to a number of calendar days from its start:
       * the last day is `lastDayAfterStart` days after the first (Texas's
       * 140-day session, which opens on the second Tuesday in January, ends
       * 139 days later). */
      readonly kind: "after-start";
      readonly start: YearlyDay;
      readonly lastDayAfterStart: number;
    };

interface SessionEndRow {
  /** Null: no regular session in years of that parity. */
  readonly oddYear: SessionEndRule | null;
  readonly evenYear: SessionEndRule | null;
  readonly estimated?: string;
}

/**
 * Dates from the act's own record that some rules count from, read only by
 * the rule that needs one. A rule whose date the caller does not have does
 * not date the act.
 */
export interface StatuteDateContext {
  /** The legislature's final passing vote on the act. */
  readonly finalPassageAt?: () => IsoDate | null;
}

interface RuleRow {
  readonly rule: StatuteEffectiveRule;
  readonly estimated?: string;
}

const EFFECTIVE_DATES = (
  startingLaw as unknown as {
    readonly effectiveDates?: {
      readonly rules: Readonly<Record<string, RuleRow>>;
      readonly sessionEnds?: Readonly<Record<string, SessionEndRow>>;
    };
  }
).effectiveDates;

const RULES: Readonly<Record<string, RuleRow>> = EFFECTIVE_DATES?.rules ?? {};
const SESSION_ENDS: Readonly<Record<string, SessionEndRow>> =
  EFFECTIVE_DATES?.sessionEnds ?? {};

/** The rule for a state (`US-XX`), read or estimated, or null where the
 * file has none. */
export function statuteEffectiveRule(
  jurisdictionKey: string,
): StatuteEffectiveRule | null {
  return Object.hasOwn(RULES, jurisdictionKey)
    ? RULES[jurisdictionKey]!.rule
    : null;
}

/**
 * Where a state's rule is not read but estimated from places like it, what
 * it was estimated from; null for a rule read from the state's own law.
 */
export function statuteEffectiveRuleEstimate(
  jurisdictionKey: string,
): string | null {
  return Object.hasOwn(RULES, jurisdictionKey)
    ? (RULES[jurisdictionKey]!.estimated ?? null)
    : null;
}

/**
 * The last day a state's regular session may run in `year`, from the one
 * session-end table every state reads, or null where the table has no row
 * or the state holds no regular session that year.
 */
export function stateRegularSessionEnd(
  jurisdictionKey: string,
  year: number,
): IsoDate | null {
  if (!Object.hasOwn(SESSION_ENDS, jurisdictionKey)) return null;
  const row = SESSION_ENDS[jurisdictionKey]!;
  const rule = year % 2 ? row.oddYear : row.evenYear;
  if (!rule) return null;
  return rule.kind === "on"
    ? dayInYear(year, rule.day)
    : addDays(dayInYear(year, rule.start), rule.lastDayAfterStart);
}

/** Whether the session-end row for a state is estimated, and from what. */
export function stateRegularSessionEndEstimate(
  jurisdictionKey: string,
): string | null {
  return Object.hasOwn(SESSION_ENDS, jurisdictionKey)
    ? (SESSION_ENDS[jurisdictionKey]!.estimated ?? null)
    : null;
}

/**
 * The date a state statute enacted on `enactedAt` takes effect under its
 * state's rule, or null where the file has no rule for the state, where the
 * rule does not reach the act (an act enacted after the date its regular
 * session's rule gives, which only a special session can do), or where the
 * rule counts from a date the act's record does not carry.
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
      // The regular session of the act's year. An act enacted on or after
      // the date this gives came from a special session, whose own
      // adjournment the game does not record, so the rule does not date it.
      const sessionEnd = stateRegularSessionEnd(jurisdictionKey, year);
      if (!sessionEnd) return null;
      const operative = addDays(sessionEnd, rule.days);
      return operative > enactedAt ? operative : null;
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

/** A fixed date, or the nth (or last, -1) weekday of the month. */
function dayInYear(year: number, day: YearlyDay): IsoDate {
  if ("day" in day) return isoDateFromParts(year, day.month, day.day);
  if (day.nth > 0) {
    const first = new Date(Date.UTC(year, day.month - 1, 1)).getUTCDay();
    const date = 1 + ((day.weekday - first + 7) % 7) + (day.nth - 1) * 7;
    return isoDateFromParts(year, day.month, date);
  }
  const lastDate = new Date(Date.UTC(year, day.month, 0)).getUTCDate();
  const last = new Date(Date.UTC(year, day.month - 1, lastDate)).getUTCDay();
  return isoDateFromParts(
    year,
    day.month,
    lastDate - ((last - day.weekday + 7) % 7),
  );
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
