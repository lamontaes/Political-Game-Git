// STOPGAP RULES3-GOV-019: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/epidemic.ts :: residentsByTown.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 954: person.birthDate > world.currentDate */
export function residentsByTownRule1(facts: {
  readonly personBirthDate: string;
  readonly currentDate: string;
}) {
  return facts.personBirthDate > facts.currentDate;
}

/** Legacy line 955: !world.jurisdictions[person.homeJurisdictionId] */
export function residentsByTownRule2(facts: {
  readonly jurisdictionsPersonHomeJurisdictionId: unknown;
}) {
  return !facts.jurisdictionsPersonHomeJurisdictionId;
}

/** Legacy line 956: !isLocalPlace(person.homeJurisdictionId) */
export function residentsByTownRule3(facts: {
  readonly isLocalPlacePersonHomeJurisdictionId: boolean;
}) {
  return !facts.isLocalPlacePersonHomeJurisdictionId;
}

/** Legacy line 957: !isPersonAliveAt(world, personId, cutoff) */
export function residentsByTownRule4(facts: {
  readonly isPersonAliveAtWorldPersonIdCutoff: boolean;
}) {
  return !facts.isPersonAliveAtWorldPersonIdCutoff;
}

/** Legacy line 958: towns.get(person.homeJurisdictionId) ?? [] */
export function residentsByTownRule5(facts: {
  readonly townsGetPersonHomeJurisdictionId: unknown;
}) {
  return facts.townsGetPersonHomeJurisdictionId ?? [];
}
