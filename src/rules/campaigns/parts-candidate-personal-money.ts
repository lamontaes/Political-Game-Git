// STOPGAP RULES3-CAM-019: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-money-sources.ts :: candidatePersonalMoney.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 415: !activeCampaignForCandidate(world, personId) */
export function candidatePersonalMoneyRule1(facts: {
  readonly activeCampaignForCandidateWorldPersonId: unknown;
}) {
  return !facts.activeCampaignForCandidateWorldPersonId;
}

/** Legacy line 417: recorded !== null */
export function candidatePersonalMoneyRule2(facts: {
  readonly recorded: number | null;
}) {
  return facts.recorded! !== null;
}
