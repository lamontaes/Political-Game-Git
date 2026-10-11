// STOPGAP RULES3-CAM-030: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-weekly-plans.ts :: suggestedAdvertising.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 549: Math.min(     channel.maxBuysPerWeek,     Math.floor(treasury.minorUnits / channel.minimumBuyMinorUnits),   ) */
export function suggestedAdvertisingRule1(facts: {
  readonly channelMaxBuysPerWeek: number;
  readonly treasuryMinorUnits: number;
  readonly channelMinimumBuyMinorUnits: number;
}) {
  return Math.min(
    facts.channelMaxBuysPerWeek,
    Math.floor(facts.treasuryMinorUnits / facts.channelMinimumBuyMinorUnits),
  );
}

/** Legacy line 553: buys <= 0 */
export function suggestedAdvertisingRule2(facts: { readonly buys: number }) {
  return facts.buys <= 0;
}

/** Legacy line 554: Math.floor(treasury.minorUnits / 2 / buys / 100) * 100 */
export function suggestedAdvertisingRule3(facts: {
  readonly treasuryMinorUnits: number;
  readonly buys: number;
}) {
  return Math.floor(facts.treasuryMinorUnits / 2 / facts.buys / 100) * 100;
}

/** Legacy line 555: Math.max(channel.minimumBuyMinorUnits, halfPerBuy) */
export function suggestedAdvertisingRule4(facts: {
  readonly channelMinimumBuyMinorUnits: number;
  readonly halfPerBuy: number;
}) {
  return Math.max(facts.channelMinimumBuyMinorUnits, facts.halfPerBuy);
}
