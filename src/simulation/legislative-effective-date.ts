import { addDays, daysBetween, isoDateFromParts, yearOf } from "./dates";
import {
  statuteEffectiveRule,
  stateSessionEnds,
  type StatuteEffectiveRule,
  statuteEffectiveDateEstimated,
  type StatuteDateContext,
} from "./governing/statute-effective-rules";
import type { LegislativeRulePack } from "./legislature-rules";
import { enactingGovernmentForPack } from "./legislation-drafting";
import type { IsoDate, LegislativeEnactmentRecord } from "./types";

/**
 * The game's declared interval when this route does not supply a date.
 * It is a game profile, never a claim about a particular state's law.
 */
export const STATUTE_EFFECTIVE_DEFAULT_DAYS = 90;
export const STATUTE_EFFECTIVE_GAME_DEFAULT_VERSION =
  "ocd-statute-effective-game-default/v1";

/** A date from an executable cited rule or the versioned game fallback. */
export type LegislativeEffectiveDateResolution =
  | { readonly kind: "source-default"; readonly effectiveAt: IsoDate | null }
  | { readonly kind: "game-default"; readonly effectiveAt: IsoDate };

export interface LegislativeDateContext extends StatuteDateContext {
  readonly emergency?: boolean;
  readonly criminalCode?: boolean;
  readonly filedTaxDate?: IsoDate | null;
}

/**
 * Resolve only the portion of a pack's default that is expressed as data.
 * A rule written in prose is evidence, not a date parser: it may depend on
 * adjournment, filing, a special-law approval, or text in the particular act.
 */
export function resolveLegislativeEffectiveDate(
  pack: LegislativeRulePack,
  enactedAt: IsoDate,
  dateContext?: LegislativeDateContext,
): LegislativeEffectiveDateResolution {
  const emergency = pack.enactment.emergencyEffectiveSchedule;
  if (dateContext?.emergency && emergency?.kind === "known")
    return {
      kind:
        emergency.source.verification === "game-profile"
          ? "game-default"
          : "source-default",
      effectiveAt: computeLegislativeEffectiveDate(emergency.value, enactedAt)!,
    };
  const review = pack.councilActions?.congressionalReviewDays;
  if (review?.kind === "known") {
    const period = dateContext?.criminalCode
      ? pack.councilActions?.criminalCodeReviewDays
      : review;
    return {
      kind: "source-default",
      effectiveAt:
        period?.kind === "known"
          ? computeLegislativeEffectiveDate(
              { kind: "congressional-review", days: period.value },
              enactedAt,
            )
          : null,
    };
  }
  if (dateContext?.filedTaxDate)
    return { kind: "source-default", effectiveAt: dateContext.filedTaxDate };

  // Local packs may carry their surrounding state's key. Only the actual
  // state/territory legislature takes that jurisdiction's statute default.
  const government = dateContext
    ? enactingGovernmentForPack(pack)?.government
    : null;
  if (
    dateContext &&
    (government === "state" || government === "territory") &&
    statuteEffectiveRule(pack.jurisdictionKey)
  ) {
    const effectiveAt = stateStatuteOperativeAt(
      pack.jurisdictionKey,
      enactedAt,
      dateContext,
    );
    return effectiveAt !== null &&
      statuteEffectiveDateEstimated(
        pack.jurisdictionKey,
        enactedAt,
        dateContext,
      )
      ? { kind: "game-default", effectiveAt }
      : { kind: "source-default", effectiveAt };
  }
  const schedule = pack.enactment.defaultEffectiveSchedule;
  if (schedule?.kind === "known") {
    switch (schedule.value.kind) {
      case "days-after-enactment":
        return {
          kind:
            schedule.source.verification === "game-profile"
              ? "game-default"
              : "source-default",
          effectiveAt: computeLegislativeEffectiveDate(
            schedule.value,
            enactedAt,
          )!,
        };
    }
  }
  const distinct = pack.enactment.effectiveDateDistinctFromEnactment;
  if (distinct.kind === "known" && !distinct.value) {
    return {
      kind:
        distinct.source.verification === "game-profile"
          ? "game-default"
          : "source-default",
      effectiveAt: enactedAt,
    };
  }
  return {
    kind: "game-default",
    effectiveAt: computeLegislativeEffectiveDate(
      { kind: "days-after-enactment", days: STATUTE_EFFECTIVE_DEFAULT_DAYS },
      enactedAt,
    )!,
  };
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
    date: computeLegislativeEffectiveDate(
      {
        kind: "days-after-enactment",
        days: profile?.days ?? STATUTE_EFFECTIVE_DEFAULT_DAYS,
      },
      enactment.resolvedAt,
    )!,
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
  return computeLegislativeEffectiveDate(rule, enactedAt, {
    ...context,
    sessionEnds: (year) =>
      context.sessionEnds?.(year) ?? stateSessionEnds(jurisdictionKey, year),
  });
}

/** The sole date-rule evaluator for statutes, ordinances, taxes and charter review. */
export function computeLegislativeEffectiveDate(
  rule:
    | StatuteEffectiveRule
    | { readonly kind: "congressional-review"; readonly days: number },
  enactedAt: IsoDate,
  context: StatuteDateContext = {},
): IsoDate | null {
  const year = yearOf(enactedAt);
  switch (rule.kind) {
    case "congressional-review": {
      let date = enactedAt;
      let counted = 0;
      while (counted < rule.days) {
        const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
        if (weekday !== 0 && weekday !== 6) counted += 1;
        date = addDays(date, 1);
      }
      return date;
    }
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
      const sessionEnd = nearest(context.sessionEnds?.(year) ?? [], enactedAt);
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

/** Preserve the tax text's delay and its existing later-than-enactment rule. */
export function resolveTaxEffectiveDate(
  enactedAt: IsoDate,
  days: number,
  notBefore: IsoDate | null,
): IsoDate {
  const date = computeLegislativeEffectiveDate(
    { kind: "days-after-enactment", days },
    enactedAt,
  )!;
  return notBefore && notBefore > date ? notBefore : date;
}

/** A compiled council carries its charter delay or congressional review in its pack. */
export function resolveCouncilEffectiveDate(
  pack: LegislativeRulePack,
  enactedAt: IsoDate,
  criminalCode = false,
  filedTaxDate: IsoDate | null = null,
): IsoDate | null {
  return resolveLegislativeEffectiveDate(pack, enactedAt, {
    criminalCode,
    filedTaxDate,
  }).effectiveAt;
}
