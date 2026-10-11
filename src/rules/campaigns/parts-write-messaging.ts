// STOPGAP RULES3-CAM-022: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-opponents.ts :: writeMessaging.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 883: !plan */
export function writeMessagingRule1(facts: { readonly plan: unknown }) {
  return !facts.plan;
}

/** Legacy line 894: plan.buys * plan.advertising.amount.minorUnits */
export function writeMessagingRule2(facts: {
  readonly planBuys: number;
  readonly planAdvertisingAmountMinorUnits: number;
}) {
  return facts.planBuys * facts.planAdvertisingAmountMinorUnits;
}
