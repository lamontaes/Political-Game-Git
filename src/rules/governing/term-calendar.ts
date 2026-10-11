// Lifted unchanged from src/simulation/nationwide-world/state-executive-term-rules.ts; RULES-3, 2026-10-11.
import { makeIsoDate } from "./dates";
import type { IsoDate } from "../../simulation/types";
import type { ChiefExecutiveBaselineRow } from "../../simulation/nationwide-world/chief-executive-baseline";

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

export interface ElectionTimingRule {
  /** Regular elections recur every this many years. */
  readonly cycleYears: number;
  /** One year in which a regular election is held. */
  readonly referenceYear: number;
  /** The general election day within an election year. */
  readonly day: "first-tuesday-after-first-monday-in-november";
}

export interface TermRuleSource {
  readonly citation: string;
  readonly url: string;
  readonly excerpt: string;
  readonly retrievedAt: IsoDate;
  readonly note: string;
}

export type TermRuleBasis = "verified" | "game-profile";

export interface TermRuleCalibration {
  readonly field: "termYears";
  readonly row: ChiefExecutiveBaselineRow;
  readonly disclosure: string;
}

export interface StateExecutiveTermRule {
  readonly stateUsps: string;
  readonly ruleVersion: string;
  /** Per field, because a state may have one verified fact and not another. */
  readonly basis: {
    readonly termYears: TermRuleBasis;
    readonly commencement: TermRuleBasis;
    readonly election: TermRuleBasis;
  };
  readonly termYears: number;
  readonly commencement: TermCommencementRule;
  readonly election: ElectionTimingRule;
  readonly sources: readonly TermRuleSource[];
  /** Present only where research set a parameter of the game profile. */
  readonly calibration: TermRuleCalibration | null;
}

export function utcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

export function iso(date: Date): IsoDate {
  return makeIsoDate(date.toISOString().slice(0, 10));
}

export function generalElectionDay(
  _rule: ElectionTimingRule,
  year: number,
): IsoDate {
  const first = utcDate(year, 10, 1);
  const toMonday = (8 - first.getUTCDay()) % 7;
  return iso(utcDate(year, 10, 1 + toMonday + 1));
}

export function isElectionYear(
  rule: ElectionTimingRule,
  year: number,
): boolean {
  return (
    (((year - rule.referenceYear) % rule.cycleYears) + rule.cycleYears) %
      rule.cycleYears ===
    0
  );
}

export function nextRegularElection(
  rule: StateExecutiveTermRule,
  onDate: IsoDate,
): IsoDate {
  let year = Number(onDate.slice(0, 4));
  while (!isElectionYear(rule.election, year)) year += 1;
  const day = generalElectionDay(rule.election, year);
  if (day >= onDate) return day;
  return generalElectionDay(rule.election, year + rule.election.cycleYears);
}

export function commencementAfter(
  rule: TermCommencementRule,
  electionDate: IsoDate,
): IsoDate {
  const electionYear = Number(electionDate.slice(0, 4));
  return commencementInYear(
    rule,
    rule.kind === "december-weekday-of-election-year"
      ? electionYear
      : electionYear + 1,
  );
}

export function commencementInYear(
  rule: TermCommencementRule,
  year: number,
): IsoDate {
  if (rule.kind === "january-first-following-election")
    return makeIsoDate(`${year}-01-01`);
  if (rule.kind === "january-fixed-day-following-election")
    return iso(utcDate(year, 0, rule.day));
  const monthIndex = rule.kind === "december-weekday-of-election-year" ? 11 : 0;
  const first = utcDate(year, monthIndex, 1);
  const toWeekday = (rule.weekday - first.getUTCDay() + 7) % 7;
  const day = 1 + toWeekday + (rule.ordinal - 1) * 7 + rule.offsetDays;
  return iso(utcDate(year, monthIndex, day));
}

export interface PlannedTermDates {
  readonly startsAt: IsoDate;
  /** Exclusive: the next term's commencement under the same rule. */
  readonly endsAt: IsoDate;
}

export function termDatesAfterElection(
  rule: StateExecutiveTermRule,
  electionDate: IsoDate,
): PlannedTermDates {
  const startsAt = commencementAfter(rule.commencement, electionDate);
  const startYear = Number(startsAt.slice(0, 4));
  return {
    startsAt,
    endsAt: commencementInYear(rule.commencement, startYear + rule.termYears),
  };
}

export function regularTermWindowOn(
  rule: StateExecutiveTermRule,
  onDate: IsoDate,
): PlannedTermDates {
  let year = Number(onDate.slice(0, 4));
  for (let guard = 0; guard < 16; guard += 1, year -= 1) {
    if (!isElectionYear(rule.election, year)) continue;
    const election = generalElectionDay(rule.election, year);
    const dates = termDatesAfterElection(rule, election);
    if (dates.startsAt <= onDate) return dates;
  }
  throw new Error(`No regular term found for ${rule.stateUsps} on ${onDate}.`);
}
