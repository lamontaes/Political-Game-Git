import { addDays, makeIsoDate, type IsoDate } from "./calendar";
import { filingWindowOpens } from "../offices/filing-window";
import {
  fieldIntakeDay,
  congressionalElectionDay,
} from "./intake-and-calendars";
import type { NominationPlan } from "../../simulation/nominations/nomination-rules";
export function congressTurnoverYears(
  before: IsoDate,
  after: IsoDate,
  established: boolean,
): number[] {
  if (after <= before || !established) return [];
  const firstYear = Number(before.slice(0, 4)) - 1;
  const lastYear =
    Number(after.slice(0, 4)) +
    (after >= filingWindowOpens(Number(after.slice(0, 4)) + 1) ? 1 : 0);
  const years: number[] = [];
  for (let year = firstYear; year <= lastYear; year++)
    if (year % 2 === 0) years.push(year);
  return years;
}
export function congressCyclePhases(
  before: IsoDate,
  after: IsoDate,
  year: number,
  ballotSetDays: number,
) {
  const electionDay = congressionalElectionDay(year);
  const newStart = makeIsoDate(`${year + 1}-01-03`);
  return {
    electionDay,
    newStart,
    nominations: after >= `${year}-02-01` && before < electionDay,
    ballots:
      before < electionDay &&
      after < electionDay &&
      after >= addDays(electionDay, -ballotSetDays),
    election: before < electionDay && electionDay <= after,
    seating: before < newStart && newStart <= after,
  };
}
export function fieldDue(
  before: IsoDate,
  after: IsoDate,
  base: IsoDate,
  plan: NominationPlan,
  year: number,
  seatDue: boolean,
  slateExists: boolean,
): IsoDate | null {
  if (!seatDue || base <= before) return null;
  const date = fieldIntakeDay(base, plan, year);
  return (before < date && date <= after) || (date <= before && !slateExists)
    ? date
    : null;
}
export function incumbentSeeking(
  incumbent: string | null,
  alive: boolean,
  controlled: boolean,
  filed: boolean,
): boolean {
  return incumbent !== null && alive && (controlled ? filed : true);
}
export function congressOutcomeGroups<
  T extends {
    readonly deadlocked?: boolean;
    readonly seat: { readonly seatKey: string };
    readonly incumbentPersonId: string | null;
    readonly chosenByLegislature?: boolean;
  },
>(decisions: readonly T[], slateSeatKeys: readonly string[]) {
  const outcomes = decisions.filter((d) => !d.deadlocked);
  const deadlocked = decisions.filter((d) => d.deadlocked);
  const decided = new Set(decisions.map((d) => d.seat.seatKey));
  return {
    outcomes,
    deadlocked,
    unfilled: slateSeatKeys.filter((key) => !decided.has(key)),
    returning: outcomes.filter((d) => d.incumbentPersonId).length,
    byLegislature: outcomes.filter((d) => d.chosenByLegislature).length,
  };
}
export function stateNominationYears(
  before: IsoDate,
  after: IsoDate,
): number[] {
  const years: number[] = [];
  for (
    let year = Number(before.slice(0, 4));
    year <= Number(after.slice(0, 4));
    year++
  )
    if (after >= `${year}-02-01` && before < `${year}-11-30`) years.push(year);
  return years;
}
export function stateCrossesAny(
  before: IsoDate,
  after: IsoDate,
  ballotSetDays: number,
  ballotsSet: (year: number) => boolean,
): boolean {
  if (after <= before) return false;
  for (
    let year = Number(before.slice(0, 4));
    year <= Number(after.slice(0, 4)) + 1;
    year++
  ) {
    const january = `${year}-01-01`;
    if (
      (before < january && january <= after) ||
      (before < `${year}-03-07` && filingWindowOpens(year) <= after) ||
      (before < `${year}-11-08` && `${year}-11-02` <= after) ||
      (before < addDays(makeIsoDate(`${year}-11-08`), -ballotSetDays) &&
        addDays(makeIsoDate(`${year}-11-02`), -ballotSetDays) <= after) ||
      (addDays(makeIsoDate(`${year}-11-02`), -ballotSetDays) <= before &&
        after < `${year}-11-02` &&
        !ballotsSet(year))
    )
      return true;
  }
  return false;
}
export function stateTurnoverYears(before: IsoDate, after: IsoDate): number[] {
  const lastYear =
    Number(after.slice(0, 4)) +
    (after >= filingWindowOpens(Number(after.slice(0, 4)) + 1) ? 1 : 0);
  return Array.from(
    { length: Math.max(0, lastYear - (Number(before.slice(0, 4)) - 4) + 1) },
    (_, i) => Number(before.slice(0, 4)) - 4 + i,
  );
}
export function stateCyclePhases(
  before: IsoDate,
  after: IsoDate,
  electionDay: IsoDate,
  ballotSetDays: number,
  ballotsSet: boolean,
  resultTags: readonly string[],
) {
  const ballotDay = addDays(electionDay, -ballotSetDays);
  return {
    ballots:
      ballotDay <= after &&
      after < electionDay &&
      (before < ballotDay || !ballotsSet),
    election: before < electionDay && electionDay <= after,
    termStarts: resultTags.flatMap((tag) => {
      if (!tag.startsWith("term-start:")) return [];
      const date = tag.slice("term-start:".length);
      return before < date && date <= after ? [makeIsoDate(date)] : [];
    }),
  };
}
export function nominationFieldSeat(
  stableKey: string,
  seatKey: string | null,
  expectedStableKey: string,
  onlyPackId?: string,
) {
  if (!seatKey || stableKey !== expectedStableKey) return null;
  const [packId, officeKey, ordinalText] = seatKey.split("|");
  if (onlyPackId !== undefined && packId !== onlyPackId) return null;
  return { packId, officeKey, ordinal: Number(ordinalText) };
}

// stopgapId: "SG-P14-elections-turnover-window"

export function congressWinnerId<Id extends string>(
  outcome: {
    readonly recordedWinnerPersonId?: Id | null;
    readonly incumbentPersonId: Id | null;
    readonly successorKey: string | null;
  },
  generated: ReadonlyMap<string, Id>,
): Id {
  return (
    outcome.recordedWinnerPersonId ??
    outcome.incumbentPersonId ??
    generated.get(outcome.successorKey!)!
  );
}
