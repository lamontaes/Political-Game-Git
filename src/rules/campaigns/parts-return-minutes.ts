// STOPGAP RULES3-CAM-012: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-life-activities.ts :: returnMinutes.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 417: !journey */
export function returnMinutesRule1(facts: { readonly journey: unknown }) {
  return !facts.journey;
}

/** Legacy line 419: Math.max(0, simulationMinutesBetween(state.start, state.end)) */
export function returnMinutesRule2(facts: {
  readonly simulationMinutesBetweenStateStartStateEnd: number;
}) {
  return Math.max(0, facts.simulationMinutesBetweenStateStartStateEnd);
}
