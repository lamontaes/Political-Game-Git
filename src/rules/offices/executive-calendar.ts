import { OFFICES_PARAMETERS } from "./parameters";
// STOPGAP offices.term-search-guard: A term search checks at most sixteen election years backward.
// stopgapId: "offices.term-search-guard"
import { validateIsoDate as makeIsoDate, type IsoDate } from "./calendar";
import type {
  StateExecutiveTermRule,
  TermCommencementRule,
  ElectionTimingRule,
  TermRuleBasis,
} from "../../simulation/nationwide-world/state-executive-term-rules";
export function isFullyVerified(rule: StateExecutiveTermRule): boolean {
  return Object.values(rule.basis).every((basis) => basis === "verified");
}

export function termRuleBasis(rule: StateExecutiveTermRule): TermRuleBasis {
  return rule.basis.termYears === "verified" &&
    rule.basis.commencement === "verified"
    ? "verified"
    : "game-profile";
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
  for (
    let guard = 0;
    guard < OFFICES_PARAMETERS.maximumTermSearchYears.value;
    guard += 1, year -= 1
  ) {
    if (!isElectionYear(rule.election, year)) continue;
    const election = generalElectionDay(rule.election, year);
    const dates = termDatesAfterElection(rule, election);
    if (dates.startsAt <= onDate) return dates;
  }
  throw new Error(`No regular term found for ${rule.stateUsps} on ${onDate}.`);
}

function utcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

function iso(date: Date): IsoDate {
  return makeIsoDate(date.toISOString().slice(0, 10));
}
interface PlannedTermDates {
  readonly startsAt: IsoDate;
  readonly endsAt: IsoDate;
}
