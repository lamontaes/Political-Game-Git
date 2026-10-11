// STOPGAP RULES3-CAM-029: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-weekly-plans.ts :: cheapestChannel.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 537: left.minimumBuyMinorUnits - right.minimumBuyMinorUnits */
export function cheapestChannelRule1(facts: {
  readonly leftMinimumBuyMinorUnits: number;
  readonly rightMinimumBuyMinorUnits: number;
}) {
  return facts.leftMinimumBuyMinorUnits - facts.rightMinimumBuyMinorUnits;
}
