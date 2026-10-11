// STOPGAP RULES3-GOV-047: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/officeholder-principles.ts :: principledLeaning.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 100: !proposition?.principles */
export function principledLeaningRule1(facts: {
  readonly propositionPrinciples: unknown;
}) {
  return !facts.propositionPrinciples;
}

/** Legacy line 102: principlesByPerson(world).get(personId) ?? [] */
export function principledLeaningRule2(facts: {
  readonly principlesByPersonWorldGetPersonId: unknown;
}) {
  return facts.principlesByPersonWorldGetPersonId ?? [];
}

/** Legacy line 103: record.formedAt > world.currentDate */
export function principledLeaningRule3(facts: {
  readonly recordFormedAt: string;
  readonly currentDate: string;
}) {
  return facts.recordFormedAt > facts.currentDate;
}

/** Legacy line 105: !prior || prior.sequence < record.sequence */
export function principledLeaningRule4(facts: {
  readonly prior: unknown;
  readonly priorSequence: number;
  readonly recordSequence: number;
}) {
  return !facts.prior || facts.priorSequence < facts.recordSequence;
}

/** Legacy line 112: !held || held.stance === "conflicted" */
export function principledLeaningRule5(facts: {
  readonly held: unknown;
  readonly heldStance: string;
}) {
  return !facts.held || facts.heldStance === "conflicted";
}

/** Legacy line 113: bearing.weight ?? 1 */
export function principledLeaningRule6(facts: {
  readonly bearingWeight: number | undefined;
}) {
  return facts.bearingWeight! ?? 1;
}

/** Legacy line 114: weight === 0 */
export function principledLeaningRule7(facts: { readonly weight: number }) {
  return facts.weight === 0;
}

/** Legacy line 116: (held.stance === "endorses") === (bearing.bearing === "consistent-with") */
export function principledLeaningRule8(facts: {
  readonly heldStance: string;
  readonly bearingBearing: string;
}) {
  return (
    (facts.heldStance === "endorses") ===
    (facts.bearingBearing === "consistent-with")
  );
}

/** Legacy line 117: score += (agrees ? 1 : -1) * held.strength * 4 * weight */
export function principledLeaningRule9(facts: {
  readonly score: number;
  readonly agrees: boolean;
  readonly heldStrength: number;
  readonly weight: number;
}) {
  return (
    facts.score +
    (facts.agrees ? 1 : -1) * facts.heldStrength * 4 * facts.weight
  );
}
