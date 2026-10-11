// STOPGAP RULES3-CAM-036: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaigns.ts :: campaignActionIsStale.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 2699: state.status === "scheduled" &&     compareSimulationMoments(state.start, world.currentMoment) < 0 */
export function campaignActionIsStaleRule1(facts: {
  readonly stateStatus: string;
  readonly compareSimulationMomentsStateStartWorldCurrentMoment: number;
}) {
  return (
    facts.stateStatus === "scheduled" &&
    facts.compareSimulationMomentsStateStartWorldCurrentMoment < 0
  );
}
