import { addDays, makeIsoDate, type IsoDate } from "./calendar";
import { isElectionYear, generalElectionDay } from "./executive-calendar";
import type { LegislativeElectionRule } from "../../simulation/legislative-election-rules";
import type { NominationPlan } from "../../simulation/nominations/nomination-rules";
import { filingWindowOpens } from "../offices/filing-window";
export function legislativeSenateElectionDay(noticeDate: IsoDate): IsoDate {
  const weekday = new Date(`${noticeDate}T00:00:00Z`).getUTCDay();
  const toTuesday = (2 - weekday + 7) % 7 || 7;
  return addDays(noticeDate, toTuesday + 7);
}
export function nextLegislativeElection(
  rule: LegislativeElectionRule,
  onDate: IsoDate,
): IsoDate {
  let year = Number(onDate.slice(0, 4));
  while (!isElectionYear(rule.election, year)) year += 1;
  const day = generalElectionDay(rule.election, year);
  if (day >= onDate) return day;
  return generalElectionDay(rule.election, year + rule.election.cycleYears);
}
export function congressionalElectionDay(year: number): IsoDate {
  const first = new Date(Date.UTC(year, 10, 1));
  const toMonday = (8 - first.getUTCDay()) % 7;
  return makeIsoDate(
    new Date(Date.UTC(year, 10, 2 + toMonday)).toISOString().slice(0, 10),
  );
}
export function fieldIntakeDay(
  base: IsoDate,
  plan: NominationPlan,
  year: number,
): IsoDate {
  if (!plan.known) return base;
  const closes = plan.filingDeadline;
  const day = closes < base ? closes : base;
  const opens = filingWindowOpens(year);
  return day < opens ? opens : day;
}
