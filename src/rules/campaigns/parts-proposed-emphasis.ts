// STOPGAP RULES3-CAM-031: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-weekly-plans.ts :: proposedEmphasis.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 635: !options.some((option) => option.emphasis === "communications") */
export function proposedEmphasisRule1(facts: {
  readonly optionsSomeOptionOptionEmphasisCommunications: boolean;
}) {
  return !facts.optionsSomeOptionOptionEmphasisCommunications;
}

/** Legacy line 635: option.emphasis === "communications" */
export function proposedEmphasisRule2(facts: {
  readonly optionEmphasis: string;
}) {
  return facts.optionEmphasis === "communications";
}

/** Legacy line 639: !managerId */
export function proposedEmphasisRule3(facts: {
  readonly managerId: string | null;
}) {
  return !facts.managerId!;
}

/** Legacy line 643: experienceDays < 90 || reliability < 0 */
export function proposedEmphasisRule4(facts: {
  readonly experienceDays: number;
  readonly reliability: number;
}) {
  return facts.experienceDays < 90 || facts.reliability < 0;
}

/** Legacy line 644: latestMemo(world, context.campaign) !== null && sociability >= 0     ? "communications"     : "field" */
export function proposedEmphasisRule5(facts: {
  readonly latestMemoWorldContextCampaign: unknown;
  readonly sociability: number;
}) {
  return facts.latestMemoWorldContextCampaign !== null && facts.sociability >= 0
    ? "communications"
    : "field";
}
