// STOPGAP RULES3-CAM-011: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-life-activities.ts :: offerIsOpen.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 386: state.status === "scheduled" &&     compareSimulationMoments(state.end, world.currentMoment) > 0 */
export function offerIsOpenRule1(facts: {
  readonly stateStatus: string;
  readonly compareSimulationMomentsStateEndWorldCurrentMoment: number;
}) {
  return (
    facts.stateStatus === "scheduled" &&
    facts.compareSimulationMomentsStateEndWorldCurrentMoment > 0
  );
}
