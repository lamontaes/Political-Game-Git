import { makeIsoDate, type IsoDate } from "./calendar";
import { ELECTION_PARAMETERS } from "./parameters";
export type TermCommencementRule =
  | {
      readonly kind: "january-first-following-election";
    }
  | {
      readonly kind: "january-fixed-day-following-election";
      readonly day: number;
    }
  | {
      readonly kind: "january-weekday-following-election";
      readonly ordinal: 1 | 2 | 3 | 4;
      readonly weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
      readonly offsetDays: number;
    }
  | {
      readonly kind: "december-weekday-of-election-year";
      readonly ordinal: 1 | 2 | 3 | 4;
      readonly weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
      readonly offsetDays: number;
    };

export interface ElectionTimingRule {
  readonly cycleYears: number;
  readonly referenceYear: number;
  readonly day: "first-tuesday-after-first-monday-in-november";
}

function utcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

function iso(date: Date): IsoDate {
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
  rule: ExecutiveCalendarFacts,
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
  readonly endsAt: IsoDate;
}

export function termDatesAfterElection(
  rule: ExecutiveCalendarFacts,
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
  rule: ExecutiveCalendarFacts,
  onDate: IsoDate,
): PlannedTermDates {
  let year = Number(onDate.slice(0, 4));
  for (
    let guard = 0;
    guard < ELECTION_PARAMETERS.termSearchYears.value;
    guard += 1, year -= 1
  ) {
    if (!isElectionYear(rule.election, year)) continue;
    const election = generalElectionDay(rule.election, year);
    const dates = termDatesAfterElection(rule, election);
    if (dates.startsAt <= onDate) return dates;
  }
  throw new Error(`No regular term found for ${rule.stateUsps} on ${onDate}.`);
}
export interface ExecutiveCalendarFacts {
  readonly stateUsps: string;
  readonly termYears: number;
  readonly commencement: TermCommencementRule;
  readonly election: ElectionTimingRule;
}
