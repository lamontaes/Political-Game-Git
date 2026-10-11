// STOPGAP RULES3-CAM-027: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-week-actions.ts :: weekEnd.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 158: -1 */
export function weekEndRule1() {
  return -1;
}

/** Legacy line 160: lastCampaignDay < seventhDay ? lastCampaignDay : seventhDay */
export function weekEndRule2(facts: {
  readonly lastCampaignDay: string;
  readonly seventhDay: string;
}) {
  return facts.lastCampaignDay < facts.seventhDay
    ? facts.lastCampaignDay
    : facts.seventhDay;
}
