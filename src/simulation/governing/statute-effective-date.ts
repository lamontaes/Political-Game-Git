import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import {
  addDays,
  daysBetween,
  isoDateFromParts,
  makeIsoDate,
  yearOf,
} from "../dates";
import type { IsoDate } from "../types";
import {
  censusRegionOf,
  censusRegionStates,
} from "../world-setup/census-regions";

/**
 * When a state statute takes effect if the act names no date of its own, by
 * the state's own rule (`effectiveDates` in the starting-law file, read from
 * each state's constitution or code). A rule marked `estimated` was not read
 * for that place: it is the most common rule among places like it, and says
 * which (ESTIMATED FROM AVERAGE). A place the file leaves out keeps the
 * caller's blanket default, which says so.
 *
 * A rule that counts from a session's end reads that end from one table for
 * every state (`sessionEnds`). For a year whose session has adjourned, that
 * is the day the legislature published as its adjournment (`adjourned`);
 * otherwise it is the latest day the state's constitution or statute lets
 * its regular session run. Where a state sets no calendar limit and has
 * published no adjournment for the year, the end is estimated from the
 * states whose end is known that year, and says so.
 *
 * In play, a legislature's leaders may adjourn its session before the limit
 * (`leaders-adjourn.ts`); the caller passes that recorded day
 * (`sessionEnds`), and it replaces the table's end for the year. A session
 * with no recorded adjournment ran to its limit. A rule counted from final passage reads the passage date the
 * enactment records (Illinois); one written from filing is counted from
 * enactment, and its note says so.
 *
 * NOT MODELED: acts that set their own date, emergency clauses, appropriation
 * acts where a state dates them differently (Minnesota, Missouri, Ohio), and
 * special sessions' own
 * adjournments: an act enacted after its regular session's rule would date
 * it is counted from the day it became law.
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
      /** `months` and then `days` after the last day of the act's regular
       * session, as the session-end table gives it, and not before
       * `notBefore` in the session's year. The count is each state's own:
       * Missouri's "ninety days after" lands on day 90 (August 28),
       * Kentucky's on day 91, because its Attorney General leaves out the
       * day of adjournment and waits for ninety full days (OAG 26-03);
       * Nebraska's "three calendar months after" takes effect the day after
       * them; Idaho's is July 1 or sixty days after, whichever is later. */
      readonly kind: "days-after-session-end";
      readonly days: number;
      readonly months?: number;
      readonly notBefore?: { readonly month: number; readonly day: number };
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
 * of a month, where `nth` -1 is the last one, moved on by `plusDays` ("the
 * first Tuesday after the first Monday" is the first Monday plus one). */
export type YearlyDay =
  | { readonly month: number; readonly day: number }
  | {
      readonly month: number;
      readonly weekday: number;
      readonly nth: number;
      readonly plusDays?: number;
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

/**
 * A place's regular sessions in odd and even years: none, one, or more than
 * one (American Samoa meets twice a year). A row marked `estimated` sets no
 * limit of its own: its session ends on the median last day of the rows
 * whose end is known, for the same year (ESTIMATED FROM AVERAGE).
 * `adjourned` holds, by year, the days the legislature published as its
 * regular sessions' adjournments; for that year they replace the limit and
 * any estimate.
 */
interface SessionEndRow {
  readonly oddYear?: readonly SessionEndRule[];
  readonly evenYear?: readonly SessionEndRule[];
  readonly estimated?: string;
  readonly adjourned?: Readonly<Record<string, AdjournedYear>>;
}

interface AdjournedYear {
  readonly dates: readonly string[];
  readonly sourceUrl: string;
  readonly quote: string;
  readonly readAt: string;
}

/**
 * Dates from the act's own record that some rules count from, read only by
 * the rule that needs one. A rule whose date the caller does not have does
 * not date the act.
 */
export interface StatuteDateContext {
  /** The legislature's final passing vote on the act. */
  readonly finalPassageAt?: () => IsoDate | null;
  /**
   * The day the enacting legislature's leaders adjourned its regular session
   * in `year`, where the World records one; it replaces the table's end for
   * that year. Null where the session ran to its limit.
   */
  readonly sessionEnds?: (year: number) => readonly IsoDate[] | null;
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
const STATE_CODES = new Set(censusRegionStates());

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
 * Whether the date a state's rule gives an act enacted on `enactedAt` rests
 * on an estimate: the rule itself, or, for a rule counted from a session's
 * end, that year's end.
 */
export function statuteEffectiveDateEstimated(
  jurisdictionKey: string,
  enactedAt: IsoDate,
  context: StatuteDateContext = {},
): boolean {
  if (statuteEffectiveRuleEstimate(jurisdictionKey)) return true;
  const year = yearOf(enactedAt);
  return (
    statuteEffectiveRule(jurisdictionKey)?.kind === "days-after-session-end" &&
    !context.sessionEnds?.(year) &&
    stateSessionEndEstimate(jurisdictionKey, year) !== null
  );
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
 * The last day of each regular session a place held or may hold in `year`,
 * from the one session-end table every state reads, earliest first: the
 * published adjournments where the year has them, else the limits its law
 * sets. Empty where the table has no row or the place holds no regular
 * session that year. An estimated row with no published adjournment gives
 * the median of the known rows' last days that year.
 */
export function stateSessionEnds(
  jurisdictionKey: string,
  year: number,
): readonly IsoDate[] {
  if (!Object.hasOwn(SESSION_ENDS, jurisdictionKey)) return [];
  const row = SESSION_ENDS[jurisdictionKey]!;
  return knownSessionEnds(row, year) ?? medianSessionEnd(year);
}

/**
 * Where a place's session end in `year` is estimated, what it was estimated
 * from; null where the year's end is published or set by its law.
 */
export function stateSessionEndEstimate(
  jurisdictionKey: string,
  year: number,
): string | null {
  if (!Object.hasOwn(SESSION_ENDS, jurisdictionKey)) return null;
  const row = SESSION_ENDS[jurisdictionKey]!;
  return knownSessionEnds(row, year) ? null : (row.estimated ?? null);
}

/**
 * The outer legal end date for a session, deliberately separate from a
 * published early sine-die date. Where the state's calendar limit is not in
 * the rule table, estimate from date-limited sessions in the same Census
 * region and retain the basis in the returned row.
 */
export function stateSessionLegalLimit(
  jurisdictionKey: string,
  year: number,
): { readonly date: IsoDate; readonly estimate: string | null } | null {
  const match = /^US-([A-Z]{2})$/.exec(jurisdictionKey);
  if (!match) return null;
  const usps = match[1]!;
  if (!STATE_CODES.has(usps)) return null;
  const row = SESSION_ENDS[jurisdictionKey];
  const actualLimits = row ? legalLimitDates(row, year) : [];
  if (actualLimits.length > 0)
    return { date: actualLimits.at(-1)!, estimate: null };

  const region = censusRegionOf(usps);
  const comparable = Object.entries(SESSION_ENDS)
    .filter(([key, candidate]) => {
      const code = /^US-([A-Z]{2})$/.exec(key)?.[1];
      return (
        code !== undefined &&
        STATE_CODES.has(code) &&
        code !== usps &&
        censusRegionOf(code) === region &&
        candidate.estimated === undefined
      );
    })
    .flatMap(([key, candidate]) => {
      const date = legalLimitDates(candidate, year).at(-1);
      return date ? [{ key, date }] : [];
    })
    .sort((left, right) => left.date.localeCompare(right.date));
  const fallback = comparable.length
    ? comparable
    : Object.entries(SESSION_ENDS)
        .filter(
          ([key, candidate]) =>
            /^US-[A-Z]{2}$/.test(key) &&
            STATE_CODES.has(key.slice(3)) &&
            candidate.estimated === undefined,
        )
        .flatMap(([key, candidate]) => {
          const date = legalLimitDates(candidate, year).at(-1);
          return date ? [{ key, date }] : [];
        })
        .sort((left, right) => left.date.localeCompare(right.date));
  if (fallback.length === 0) return null;
  const median = fallback[Math.floor((fallback.length - 1) / 2)]!;
  const basis = comparable.length
    ? `${comparable.length} date-limited session row(s) in the ${region} Census region (for example ${median.key})`
    : `${fallback.length} date-limited state session row(s) nationally (for example ${median.key}); no same-region date limit was available`;
  return {
    date: median.date,
    estimate: `ESTIMATED FROM SIMILAR STATES: ${basis}; ${year} session year.`,
  };
}

/**
 * A row's session ends in `year` from its own data: the published
 * adjournments, else its limits. Null for an estimated row with neither.
 */
function knownSessionEnds(row: SessionEndRow, year: number): IsoDate[] | null {
  const adjourned = row.adjourned?.[String(year)];
  if (adjourned) return adjourned.dates.map((date) => makeIsoDate(date)).sort();
  if (row.estimated) return null;
  return ((year % 2 ? row.oddYear : row.evenYear) ?? [])
    .map((rule) =>
      rule.kind === "on"
        ? dayInYear(year, rule.day)
        : addDays(dayInYear(year, rule.start), rule.lastDayAfterStart),
    )
    .sort();
}

function legalLimitDates(row: SessionEndRow, year: number): IsoDate[] {
  const rules = year % 2 ? row.oddYear : row.evenYear;
  return (rules ?? [])
    .map((rule) =>
      rule.kind === "on"
        ? dayInYear(year, rule.day)
        : addDays(dayInYear(year, rule.start), rule.lastDayAfterStart),
    )
    .sort();
}

function medianSessionEnd(year: number): readonly IsoDate[] {
  const lastDays = Object.values(SESSION_ENDS)
    .map((row) => knownSessionEnds(row, year)?.at(-1))
    .filter((date): date is IsoDate => date !== undefined)
    .sort();
  // The lower middle when the count is even, so the result is a real row's.
  const median = lastDays[Math.floor((lastDays.length - 1) / 2)];
  return median ? [median] : [];
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
      // The regular session of the act's year whose end is nearest the act:
      // it passed during that session or was signed in the days after it.
      // GAME ASSUMPTION: an act the rule would date on or before the day it
      // became law (signed long after the session's limit, a year with no
      // regular session, a special session, or a legislature that sits all
      // year) shows its session ran at least that long, so the count starts
      // from the act instead.
      const counted = (end: IsoDate): IsoDate => {
        const operative = addDays(addMonths(end, rule.months ?? 0), rule.days);
        return rule.notBefore
          ? latest(
              operative,
              isoDateFromParts(year, rule.notBefore.month, rule.notBefore.day),
            )
          : operative;
      };
      const sessionEnd = nearest(
        context.sessionEnds?.(year) ?? stateSessionEnds(jurisdictionKey, year),
        enactedAt,
      );
      const operative = sessionEnd ? counted(sessionEnd) : null;
      return operative && operative > enactedAt
        ? operative
        : counted(enactedAt);
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
  let date: number;
  if (day.nth > 0) {
    const first = new Date(Date.UTC(year, day.month - 1, 1)).getUTCDay();
    date = 1 + ((day.weekday - first + 7) % 7) + (day.nth - 1) * 7;
  } else {
    const lastDate = new Date(Date.UTC(year, day.month, 0)).getUTCDate();
    const last = new Date(Date.UTC(year, day.month - 1, lastDate)).getUTCDay();
    date = lastDate - ((last - day.weekday + 7) % 7);
  }
  return addDays(isoDateFromParts(year, day.month, date), day.plusDays ?? 0);
}

function nearest(dates: readonly IsoDate[], to: IsoDate): IsoDate | null {
  let best: IsoDate | null = null;
  for (const date of dates)
    if (
      best === null ||
      Math.abs(daysBetween(date, to)) < Math.abs(daysBetween(best, to))
    )
      best = date;
  return best;
}

/** The same day of the month `months` later, or the month's last day. */
function addMonths(date: IsoDate, months: number): IsoDate {
  if (months === 0) return date;
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const index = month - 1 + months;
  const targetYear = year + Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return isoDateFromParts(targetYear, targetMonth, Math.min(day, lastDay));
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
