// STOPGAP RULES3-GOV-017: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/epidemic.ts :: peopleAlreadyIll.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 766: record.kind !== "health-episode" */
export function peopleAlreadyIllRule1(facts: { readonly recordKind: string }) {
  return facts.recordKind !== "health-episode";
}

/** Legacy line 767: outbreakKeyOf(record) !== null */
export function peopleAlreadyIllRule2(facts: {
  readonly outbreakKeyOfRecord: string | null;
}) {
  return facts.outbreakKeyOfRecord! !== null;
}

/** Legacy line 768: record.effectiveAt > world.currentDate */
export function peopleAlreadyIllRule3(facts: {
  readonly recordEffectiveAt: string;
  readonly currentDate: string;
}) {
  return facts.recordEffectiveAt > facts.currentDate;
}

/** Legacy line 770: state === "recovered" || state === "deceased" */
export function peopleAlreadyIllRule4(facts: {
  readonly state: string | undefined;
}) {
  return facts.state! === "recovered" || facts.state! === "deceased";
}
