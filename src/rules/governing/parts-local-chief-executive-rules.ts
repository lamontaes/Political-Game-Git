// STOPGAP RULES3-GOV-073: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/nationwide-world/local-chief-executive-rules.ts :: localChiefExecutiveRules.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 145: unit.unitType !== "municipality" || !unit.functionalActive */
export function localChiefExecutiveRulesRule1(facts: {
  readonly unitUnitType: string;
  readonly unitFunctionalActive: boolean;
}) {
  return facts.unitUnitType !== "municipality" || !facts.unitFunctionalActive;
}

/** Legacy line 147: government ? primaryReading(government) : null */
export function localChiefExecutiveRulesRule2(facts: {
  readonly government: unknown;
  readonly primaryReadingGovernment: unknown;
}) {
  return facts.government ? facts.primaryReadingGovernment : null;
}

/** Legacy line 148: reading ? readDirectElection(reading) : null */
export function localChiefExecutiveRulesRule3(facts: {
  readonly reading: unknown;
  readonly readDirectElectionReading: boolean | null;
}) {
  return facts.reading ? facts.readDirectElectionReading! : null;
}

/** Legacy line 149: unit.placeGeoid ? populationOf(unit.placeGeoid) : null */
export function localChiefExecutiveRulesRule4(facts: {
  readonly unitPlaceGeoid: string | null;
  readonly populationOfUnitPlaceGeoid: number | null;
}) {
  return facts.unitPlaceGeoid! ? facts.populationOfUnitPlaceGeoid! : null;
}

/** Legacy line 151: population !== null && population > OWNER_LARGE_CITY_POPULATION */
export function localChiefExecutiveRulesRule5(facts: {
  readonly population: number | null;
  readonly OWNER_LARGE_CITY_POPULATION: number;
}) {
  return (
    facts.population! !== null &&
    facts.population > facts.OWNER_LARGE_CITY_POPULATION
  );
}

/** Legacy line 152: reading ? readMayorTerm(reading) : null */
export function localChiefExecutiveRulesRule6(facts: {
  readonly reading: unknown;
  readonly readMayorTermReading: number | null;
}) {
  return facts.reading ? facts.readMayorTermReading! : null;
}

/** Legacy line 155: government?.key ?? null */
export function localChiefExecutiveRulesRule7(facts: {
  readonly governmentKey: string | undefined;
}) {
  return facts.governmentKey! ?? null;
}

/** Legacy line 157: direct !== null         ? { value: direct, basis: "read" }         : largeCity           ? { value: true, basis: "owner-interim" }           : MOST_COMMON_DIRECT_ELECTION */
export function localChiefExecutiveRulesRule8(facts: {
  readonly direct: boolean | null;
  readonly valueDirectBasisRead: unknown;
  readonly largeCity: boolean;
  readonly valueTrueBasisOwnerInterim: unknown;
  readonly MOST_COMMON_DIRECT_ELECTION: unknown;
}) {
  return facts.direct! !== null
    ? facts.valueDirectBasisRead
    : facts.largeCity
      ? facts.valueTrueBasisOwnerInterim
      : facts.MOST_COMMON_DIRECT_ELECTION;
}

/** Legacy line 162: reading?.mayor?.title       ? { value: reading.mayor.title, basis: "read" }       : { value: "Mayor", basis: "typical" } */
export function localChiefExecutiveRulesRule9(facts: {
  readonly readingMayorTitle: string | undefined;
  readonly valueReadingMayorTitleBasisRead: unknown;
  readonly valueMayorBasisTypical: unknown;
}) {
  return facts.readingMayorTitle!
    ? facts.valueReadingMayorTitleBasisRead
    : facts.valueMayorBasisTypical;
}

/** Legacy line 166: term !== null ? { value: term, basis: "read" } : MOST_COMMON_TERM */
export function localChiefExecutiveRulesRule10(facts: {
  readonly term: number | null;
  readonly valueTermBasisRead: unknown;
  readonly MOST_COMMON_TERM: unknown;
}) {
  return facts.term! !== null
    ? facts.valueTermBasisRead
    : facts.MOST_COMMON_TERM;
}
