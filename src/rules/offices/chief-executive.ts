// STOPGAP offices.chief-executive-profile: Unread towns use the national modal direct-election/four-year Mayor profile, with the owner interim population gate.
// stopgapId: "offices.chief-executive-profile"
import type { GovernmentUnitIdentity } from "../../simulation/government-units";
import type { MunicipalReading } from "../../simulation/municipal-government";
import type {
  LocalChiefExecutiveRules,
  ChiefExecutiveValue,
} from "../../simulation/nationwide-world/local-chief-executive-rules";
export interface ChiefParameters {
  readonly largeCityPopulation: number;
  readonly directElection: ChiefExecutiveValue<boolean>;
  readonly term: ChiefExecutiveValue<number>;
}
const CHOSEN_BY_COUNCIL =
  /\b(chosen|selected|selects|elects?) (by the council|one of (its|their|them)|one of its own)|no separately elected executive/i;

const CHOSEN_BY_VOTERS =
  /\b(separately|directly|popularly) elected|elected at[- ]large|elected by the (registered )?(qualified )?(electors|voters)/i;

export function readDirectElection(reading: MunicipalReading): boolean | null {
  const selection = reading.executiveSelection ?? "";
  if (CHOSEN_BY_COUNCIL.test(selection)) return false;
  if (CHOSEN_BY_VOTERS.test(selection)) return true;
  if (reading.mayor?.structuralPosition === "SEPARATE_CHIEF_EXECUTIVE")
    return true;
  if (reading.form === "MAYOR_COUNCIL") return true;
  if (reading.form === "TOWN_MEETING" || reading.form === "ANNUAL_TOWN_MEETING")
    return false;
  return null;
}

export function isMayorSeatClass(seatClass: string): boolean {
  return (
    /\bmayor\b/i.test(seatClass) && !/\bvice\b|\bcouncil\b/i.test(seatClass)
  );
}

export function readMayorTerm(reading: MunicipalReading): number | null {
  const years = new Set(
    reading.terms
      .filter((term) => isMayorSeatClass(term.seatClass))
      .map((term) => term.years)
      .filter((value): value is number => value !== null && value > 0),
  );
  return years.size === 1 ? [...years][0]! : null;
}

export function localChiefExecutiveRules(
  unit: GovernmentUnitIdentity,
  government: { readonly key: string } | null,
  reading: MunicipalReading | null,
  population: number | null,
  parameters: ChiefParameters,
): LocalChiefExecutiveRules | null {
  if (unit.unitType !== "municipality" || !unit.functionalActive) return null;
  const direct = reading ? readDirectElection(reading) : null;
  const largeCity =
    population !== null && population > parameters.largeCityPopulation;
  const term = reading ? readMayorTerm(reading) : null;
  return {
    unitId: unit.id,
    researchedGovernmentKey: government?.key ?? null,
    directlyElected:
      direct !== null
        ? { value: direct, basis: "read" }
        : largeCity
          ? { value: true, basis: "owner-interim" }
          : parameters.directElection,
    title: reading?.mayor?.title
      ? { value: reading.mayor.title, basis: "read" }
      : { value: "Mayor", basis: "typical" },
    termYears: term !== null ? { value: term, basis: "read" } : parameters.term,
  };
}
