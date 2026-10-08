import { addDays, daysBetween, isoDateFromParts, yearOf } from "./dates";
import {
  stateSessionEnds,
  statuteEffectiveRule,
  statuteEffectiveDateEstimated,
  type StatuteDateContext,
} from "./governing/statute-effective-date";
import type { LegislativeRulePack } from "./legislature-rules";
import { enactingGovernmentForPack } from "./legislation-drafting";
import type {
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "./types";

/**
 * WHEN A LAW TAKES EFFECT, for every body in every place.
 *
 * This module is the only place an effective date is computed. Every route
 * that records an enactment (`recordEnactment`) and every reader of a saved
 * one (`operativeDateForEnactment`, the tax activation check) asks it. The
 * enacting body's rule pack supplies the rule as data, and the act's own
 * record supplies the facts the rule counts from:
 *
 * 1. Congressional review: a pack whose council acts carry a review period
 *    (`councilActions.congressionalReviewDays`) dates its acts the day after
 *    the period, the longer criminal-law period for an act that amends the
 *    criminal code.
 * 2. The act's own stated timing: a filed typed levy names its own delay.
 * 3. A state or territory legislature: its state's recorded rule
 *    (`effectiveDates` in the starting-law file, read through
 *    `governing/statute-effective-date.ts`).
 * 4. The pack's executable default (`defaultEffectiveSchedule`): a council's
 *    read rule, or the local ordinance estimate where none was read
 *    (`localOrdinanceDefaultEnactment` in `legislature-rules.ts`).
 * 5. A body whose acts take effect when enacted.
 * 6. Otherwise the game's statute interval.
 */

/**
 * The game's declared interval when this route does not supply a date.
 * It is a game profile, never a claim about a particular state's law.
 */
export const STATUTE_EFFECTIVE_DEFAULT_DAYS = 90;
export const STATUTE_EFFECTIVE_GAME_DEFAULT_VERSION =
  "ocd-statute-effective-game-default/v1";

/** A date from an executable cited rule, the act's own terms, or the versioned game fallback. */
export type LegislativeEffectiveDateResolution =
  | { readonly kind: "source-default"; readonly effectiveAt: IsoDate | null }
  | { readonly kind: "game-default"; readonly effectiveAt: IsoDate }
  | { readonly kind: "act-date"; readonly effectiveAt: IsoDate };

/** The timing an act states for itself: so many days after enactment. */
export interface ActStatedTiming {
  readonly delayDays: number;
  /** Never before the date the enacting body's own rule gives. */
  readonly notBeforeBodyDefault: boolean;
}

/**
 * Facts from the act's own record that a rule may count from, each read only
 * by the rule that needs it. A rule whose fact the caller does not have does
 * not date the act.
 */
export interface EffectiveDateContext extends StatuteDateContext {
  /** Whether the act amends the criminal code (the longer review period). */
  readonly amendsCriminalCode?: () => boolean;
  /** The act's own timing, where it states one. */
  readonly statedTiming?: ActStatedTiming | null;
}

/**
 * The date an act of this body enacted on `enactedAt` takes effect, and what
 * it rests on.
 */
export function resolveLegislativeEffectiveDate(
  pack: LegislativeRulePack,
  enactedAt: IsoDate,
  context: EffectiveDateContext = {},
): LegislativeEffectiveDateResolution {
  return (
    executableEffectiveDate(pack, enactedAt, context) ?? {
      kind: "game-default",
      effectiveAt: addDays(enactedAt, STATUTE_EFFECTIVE_DEFAULT_DAYS),
    }
  );
}

/**
 * The same answer where a rule or the act itself dates the act; null where
 * only the game's statute interval would. The enactment writer saves the
 * former and leaves the latter for `operativeDateForEnactment`, so no
 * invented interval is saved.
 */
export function executableEffectiveDate(
  pack: LegislativeRulePack,
  enactedAt: IsoDate,
  context: EffectiveDateContext = {},
): LegislativeEffectiveDateResolution | null {
  // An act under review takes effect only when the review period ends,
  // whatever date it names for itself.
  const review = pack.councilActions?.congressionalReviewDays;
  if (review?.kind === "known") {
    const period = context.amendsCriminalCode?.()
      ? pack.councilActions?.criminalCodeReviewDays
      : review;
    return {
      kind: "source-default",
      effectiveAt:
        period?.kind === "known"
          ? congressionalReviewEffectiveOn(enactedAt, period.value)
          : null,
    };
  }
  const body = bodyDefaultEffectiveDate(pack, enactedAt, context);
  const timing = context.statedTiming;
  if (!timing) return body;
  return {
    kind: "act-date",
    effectiveAt: statedEffectiveDate(
      enactedAt,
      timing,
      body
        ? body.effectiveAt
        : addDays(enactedAt, STATUTE_EFFECTIVE_DEFAULT_DAYS),
    ),
  };
}

function bodyDefaultEffectiveDate(
  pack: LegislativeRulePack,
  enactedAt: IsoDate,
  context: StatuteDateContext,
): LegislativeEffectiveDateResolution | null {
  // Local packs may carry their surrounding state's key. Only the actual
  // state/territory legislature takes that jurisdiction's statute default.
  const government = enactingGovernmentForPack(pack)?.government;
  if (
    (government === "state" || government === "territory") &&
    statuteEffectiveRule(pack.jurisdictionKey)
  ) {
    const effectiveAt = stateStatuteOperativeAt(
      pack.jurisdictionKey,
      enactedAt,
      context,
    );
    return effectiveAt !== null &&
      statuteEffectiveDateEstimated(pack.jurisdictionKey, enactedAt, context)
      ? { kind: "game-default", effectiveAt }
      : { kind: "source-default", effectiveAt };
  }
  const schedule = pack.enactment.defaultEffectiveSchedule;
  if (schedule?.kind === "known")
    return {
      kind:
        schedule.source.verification === "game-profile"
          ? "game-default"
          : "source-default",
      effectiveAt: addDays(enactedAt, schedule.value.days),
    };
  const distinct = pack.enactment.effectiveDateDistinctFromEnactment;
  if (distinct.kind === "known" && !distinct.value)
    return {
      kind:
        distinct.source.verification === "game-profile"
          ? "game-default"
          : "source-default",
      effectiveAt: enactedAt,
    };
  return null;
}

/**
 * The date an act's own timing gives it: its delay after enactment, and,
 * where it says so, never before its body's own date.
 */
export function statedEffectiveDate(
  enactedAt: IsoDate,
  timing: ActStatedTiming,
  bodyDefaultAt: IsoDate | null,
): IsoDate {
  const own = addDays(enactedAt, timing.delayDays);
  return timing.notBeforeBodyDefault && bodyDefaultAt && bodyDefaultAt > own
    ? bodyDefaultAt
    : own;
}

/** The date a saved fictional profile interval gives an act. */
export function gameProfileEffectiveDate(
  enactedAt: IsoDate,
  profile: { readonly days: number },
): IsoDate {
  return addDays(enactedAt, profile.days);
}

/** One answer shared by every consumer of an enacted measure. */
export function operativeDateForEnactment(
  enactment: LegislativeEnactmentRecord,
  /** `US-XX` of a state statute: its own researched rule dates an act that saved none. */
  stateKey?: string | null,
  /** The dates the enactment's record carries that the state's rule may count from. */
  dateContext?: StatuteDateContext,
): {
  readonly date: IsoDate;
  readonly basis: "enacted-date" | "state-rule" | "game-default";
} | null {
  if (enactment.effectiveAt) {
    return {
      date: enactment.effectiveAt,
      basis:
        enactment.effectiveDateBasis === "game-default"
          ? "game-default"
          : "enacted-date",
    };
  }
  if (enactment.effectiveDateBasis === "source-default") return null;
  const profile = enactment.effectiveDateGameProfile;
  if (
    profile &&
    (!profile.version ||
      !Number.isSafeInteger(profile.days) ||
      profile.days < 0)
  ) {
    throw new Error(
      "An enactment carries an invalid effective-date game profile.",
    );
  }
  const stateRuleAt =
    !profile && stateKey?.startsWith("US-")
      ? stateStatuteOperativeAt(
          stateKey,
          enactment.resolvedAt,
          dateContext ?? {
            finalPassageAt: () => enactment.finalPassageAt ?? null,
          },
        )
      : null;
  if (stateRuleAt) return { date: stateRuleAt, basis: "state-rule" };
  return {
    date: gameProfileEffectiveDate(
      enactment.resolvedAt,
      profile ?? { days: STATUTE_EFFECTIVE_DEFAULT_DAYS },
    ),
    basis: "game-default",
  };
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

/**
 * Congressional review of the District's acts, D.C. Code § 1-206.02(c)(1):
 * the Chairman transmits the act to the Speaker and the President of the
 * Senate, and it takes effect when a 30-day period (excluding Saturdays,
 * Sundays, holidays and days neither House sits) expires, unless a joint
 * resolution disapproving it is enacted first. The period's length is the
 * pack's (`councilActions`).
 *
 * The date an act transmitted on `transmittedOn` takes effect: the day after
 * the last day of the review period, counting the day of transmittal when it
 * is a weekday (the period begins on that day).
 *
 * RECORDED GAME PROFILE: the days counted here skip Saturdays and Sundays
 * only. Holidays are not excluded, because no holiday calendar is read, and
 * both Houses are taken to be sitting, because no congressional sitting
 * calendar is read. No joint resolution of disapproval is ever enacted in
 * play.
 */
export function congressionalReviewEffectiveOn(
  transmittedOn: IsoDate,
  days: number,
): IsoDate {
  const firstCounted = isWeekend(transmittedOn) ? 0 : 1;
  const lastDay =
    firstCounted === 1 && days === 1
      ? transmittedOn
      : addWeekdays(transmittedOn, days - firstCounted);
  return addDays(lastDay, 1);
}

/**
 * Questions whose acts the game treats as codified in Title 22 (criminal
 * offenses), 23 (criminal procedure) or 24 (prisoners and their treatment),
 * which § 1-206.02(c)(2) gives a 60-day review instead of 30.
 *
 * RECORDED GAME PROFILE: an act in play
 * records the policy question it answers, not the Code title it amends, so
 * this mapping from question to title is the game's own inference. A
 * councilmember's own act names no question and takes the ordinary period.
 * The 60 days are counted like the 30, skipping weekends only.
 */
const CRIMINAL_CODE_ISSUE_KEYS: ReadonlySet<string> = new Set([
  "us-state-and-local:justice-public-safety.criminal-law-and-sentencing",
  "us-state-and-local:justice-public-safety.prosecution-and-defense",
  "us-state-and-local:justice-public-safety.corrections-and-prisons",
  "us-state-and-local:justice-public-safety.reentry",
]);

/** Whether an act answers a question the game places in Titles 22 to 24. */
export function actAmendsCriminalCode(
  world: World,
  measure: LegislativeMeasureRecord,
): boolean {
  const catalog = world.policyCatalog;
  return (measure.propositionIds ?? []).some((id) => {
    const issueId = catalog.propositions[id]?.issueId;
    const issue = issueId ? catalog.issues[issueId] : undefined;
    return issue !== undefined && CRIMINAL_CODE_ISSUE_KEYS.has(issue.stableKey);
  });
}

function isWeekend(date: IsoDate): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

/** The date `count` weekdays after `from`, not counting `from` itself. */
function addWeekdays(from: IsoDate, count: number): IsoDate {
  let date = from;
  let counted = 0;
  while (counted < count) {
    date = addDays(date, 1);
    if (!isWeekend(date)) counted += 1;
  }
  return date;
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
