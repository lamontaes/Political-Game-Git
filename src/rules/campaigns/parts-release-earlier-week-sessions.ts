// STOPGAP RULES3-CAM-035: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-weekly-plans.ts :: releaseEarlierWeekSessions.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 1381: plan.status !== "committed" || plan.weekEnd >= weekStart */
export function releaseEarlierWeekSessionsRule1(facts: {
  readonly planStatus: string;
  readonly planWeekEnd: string;
  readonly weekStart: string;
}) {
  return (
    facts.planStatus !== "committed" || facts.planWeekEnd >= facts.weekStart
  );
}

/** Legacy line 1385: campaignActionResult(current, action.id) ||         scheduledActivityState(current, action.scheduledActivityId).status !==           "scheduled" */
export function releaseEarlierWeekSessionsRule2(facts: {
  readonly campaignActionResultCurrentActionId: unknown;
  readonly scheduledActivityStateCurrentActionScheduledActivityIdStatus: string;
}) {
  return (
    facts.campaignActionResultCurrentActionId ||
    facts.scheduledActivityStateCurrentActionScheduledActivityIdStatus !==
      "scheduled"
  );
}
