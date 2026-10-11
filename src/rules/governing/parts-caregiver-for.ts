// STOPGAP RULES3-GOV-024: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/epidemic.ts :: caregiverFor.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 1259: id !== childId &&         world.people[id] &&         ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18 */
export function caregiverForRule1(facts: {
  readonly id: string;
  readonly childId: string;
  readonly peopleId: unknown;
  readonly ageOnDateWorldPeopleIdBirthDateWorldCurrentDate: number;
}) {
  return (
    facts.id !== facts.childId &&
    facts.peopleId &&
    facts.ageOnDateWorldPeopleIdBirthDateWorldCurrentDate >= 18
  );
}

/** Legacy line 1265: a.hours - b.hours || a.id.localeCompare(b.id) */
export function caregiverForRule2(facts: {
  readonly aHours: number;
  readonly bHours: number;
  readonly aIdLocaleCompareBId: number;
}) {
  return facts.aHours - facts.bHours || facts.aIdLocaleCompareBId;
}

/** Legacy line 1266: ranked[0]?.id ?? null */
export function caregiverForRule3(facts: {
  readonly ranked0Id: string | undefined;
}) {
  return facts.ranked0Id! ?? null;
}
