// STOPGAP RULES3-GOV-075: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/nationwide-world/state-executive-terms.ts :: ordinaryStateExecutiveTermDates.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 97: Number(electionDate.slice(0, 4)) */
export function ordinaryStateExecutiveTermDatesRule1(facts: {
  readonly electionDateSlice04: string;
}) {
  return Number(facts.electionDateSlice04);
}

/** Legacy line 100: inWorld && inWorld.enactedChanges.length > 0       ? null       : admittedTermDates(identity, electionDate) */
export function ordinaryStateExecutiveTermDatesRule2(facts: {
  readonly inWorld: unknown;
  readonly inWorldEnactedChangesLength: number;
  readonly admittedTermDatesIdentityElectionDate: unknown;
}) {
  return facts.inWorld && facts.inWorldEnactedChangesLength > 0
    ? null
    : facts.admittedTermDatesIdentityElectionDate;
}

/** Legacy line 105: !rule */
export function ordinaryStateExecutiveTermDatesRule3(facts: {
  readonly rule: unknown;
}) {
  return !facts.rule;
}
