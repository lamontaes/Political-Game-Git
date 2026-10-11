// STOPGAP RULES3-CAM-032: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-weekly-plans.ts :: sessionView.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 669: campaignActionResult(world, action.id)     ? "completed"     : state.status */
export function sessionViewRule1(facts: {
  readonly campaignActionResultWorldActionId: unknown;
  readonly stateStatus: string;
}) {
  return facts.campaignActionResultWorldActionId
    ? "completed"
    : facts.stateStatus;
}

/** Legacy line 678: action.plannedSpend ? { ...action.plannedSpend } : null */
export function sessionViewRule2(facts: {
  readonly actionPlannedSpend: unknown;
  readonly actionPlannedSpend2: unknown;
}) {
  return facts.actionPlannedSpend ? facts.actionPlannedSpend2 : null;
}

/** Legacy line 681: status === "scheduled" &&       compareSimulationMoments(state.start, world.currentMoment) < 0 */
export function sessionViewRule3(facts: {
  readonly status: string;
  readonly compareSimulationMomentsStateStartWorldCurrentMoment: number;
}) {
  return (
    facts.status === "scheduled" &&
    facts.compareSimulationMomentsStateStartWorldCurrentMoment < 0
  );
}
