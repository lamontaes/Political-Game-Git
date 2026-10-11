// STOPGAP RULES3-GOV-082: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/public-service-producer.ts :: residentsOf.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 303: world.control.kind === "person" ? world.control.personId : null */
export function residentsOfRule1(facts: {
  readonly controlKind: string;
  readonly controlPersonId: string;
}) {
  return facts.controlKind === "person" ? facts.controlPersonId : null;
}

/** Legacy line 307: id !== controlled &&         ageOnDate(world.people[id]!.birthDate, world.currentDate) >=           ADULT_AGE &&         livesInServiceArea(world, id, jurisdictionId, programKey) */
export function residentsOfRule2(facts: {
  readonly id: string;
  readonly controlled: string | null;
  readonly ageOnDateWorldPeopleIdBirthDateWorldCurrentDate: number;
  readonly ADULT_AGE: number;
  readonly livesInServiceAreaWorldIdJurisdictionIdProgramKey: boolean;
}) {
  return (
    facts.id !== facts.controlled! &&
    facts.ageOnDateWorldPeopleIdBirthDateWorldCurrentDate >= facts.ADULT_AGE &&
    facts.livesInServiceAreaWorldIdJurisdictionIdProgramKey
  );
}
