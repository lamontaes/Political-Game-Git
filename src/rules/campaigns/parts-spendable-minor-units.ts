// STOPGAP RULES3-CAM-020: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-operating-costs.ts :: spendableMinorUnits.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 174: !position */
export function spendableMinorUnitsRule1(facts: {
  readonly position: unknown;
}) {
  return !facts.position;
}

/** Legacy line 175: committee.own     ? campaignActions(world, committee.campaign.id)         .filter(           (action) =>             action.plannedSpend !== null &&             campaignActionResult(world, action.id) === null &&             // A buy let go, called of */
export function spendableMinorUnitsRule2(facts: {
  readonly committeeOwn: boolean;
  readonly campaignActionsResult: number;
}) {
  return facts.committeeOwn ? facts.campaignActionsResult : 0;
}

/** Legacy line 179: action.plannedSpend !== null &&             campaignActionResult(world, action.id) === null &&             // A buy let go, called off, or whose time passed will never run.             scheduledActivityState(world, action.scheduledActivityId).status  */
export function spendableMinorUnitsRule3(facts: {
  readonly actionPlannedSpend: unknown;
  readonly campaignActionResultWorldActionId: unknown;
  readonly scheduledActivityStateWorldActionScheduledActivityIdStatus: string;
  readonly scheduledActivityStateWorldActionScheduledActivityIdStartDate: string;
  readonly currentDate: string;
}) {
  return (
    facts.actionPlannedSpend !== null &&
    facts.campaignActionResultWorldActionId === null &&
    facts.scheduledActivityStateWorldActionScheduledActivityIdStatus ===
      "scheduled" &&
    facts.scheduledActivityStateWorldActionScheduledActivityIdStartDate >=
      facts.currentDate
  );
}

/** Legacy line 187: sum + action.plannedSpend!.minorUnits */
export function spendableMinorUnitsRule4(facts: {
  readonly sum: number;
  readonly actionPlannedSpendMinorUnits: number;
}) {
  return facts.sum + facts.actionPlannedSpendMinorUnits;
}

/** Legacy line 189: position.liquidBalance.minorUnits - committed */
export function spendableMinorUnitsRule5(facts: {
  readonly positionLiquidBalanceMinorUnits: number;
  readonly committed: number;
}) {
  return facts.positionLiquidBalanceMinorUnits - facts.committed;
}
