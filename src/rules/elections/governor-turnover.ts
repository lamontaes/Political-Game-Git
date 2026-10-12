import { addDays, type IsoDate } from "./calendar";
import {
  nextRegularElectionInWorld,
  type ExecutiveTermFacts,
} from "./executive-law-calendar";
export function nextFieldClose(
  facts: ExecutiveTermFacts,
  stateUsps: string,
  after: IsoDate,
  fieldClosesDaysBefore: number,
) {
  let electionDay = nextRegularElectionInWorld(facts, stateUsps, after);
  while (
    electionDay !== null &&
    addDays(electionDay, -fieldClosesDaysBefore) <= after
  )
    electionDay = nextRegularElectionInWorld(
      facts,
      stateUsps,
      addDays(electionDay, 1),
    );
  return electionDay === null
    ? null
    : { year: Number(electionDay.slice(0, 4)), electionDay };
}
export function regularFieldClosed(
  currentDate: IsoDate,
  electionDay: IsoDate,
  fieldClosesDaysBefore: number,
): boolean {
  return currentDate >= addDays(electionDay, -fieldClosesDaysBefore);
}
export function applyGovernorTurnover(
  before: IsoDate,
  currentDate: IsoDate,
  materializedOffices: readonly {
    readonly officeKey: string;
    readonly stateUsps: string;
  }[],
) {
  if (currentDate <= before) return [];
  return materializedOffices.map((office) => ({
    officeKey: office.officeKey,
    stateUsps: office.stateUsps,
    onDate: currentDate,
  }));
}
export function incumbentGovernorStandingAgain(
  officeExists: boolean,
  incumbentPersonId: string | null,
  seeking: boolean,
) {
  return officeExists && seeking ? incumbentPersonId : null;
}
