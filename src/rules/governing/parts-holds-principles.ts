// STOPGAP RULES3-GOV-048: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/officeholder-principles.ts :: holdsPrinciples.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 295: (principlesByPerson(world).get(personId)?.length ?? 0) > 0 */
export function holdsPrinciplesRule1(facts: {
  readonly principlesByPersonWorldGetPersonIdLength: number | undefined;
}) {
  return (facts.principlesByPersonWorldGetPersonIdLength! ?? 0) > 0;
}
