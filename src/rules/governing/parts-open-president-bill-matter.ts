// STOPGAP RULES3-GOV-056: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/state-governing.ts :: openPresidentBillMatter.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 372: !office ||     measurePosition(world, measure.id).phase !== "awaiting-executive" */
export function openPresidentBillMatterRule1(facts: {
  readonly office: unknown;
  readonly measurePositionWorldMeasureIdPhase: string;
}) {
  return (
    !facts.office ||
    facts.measurePositionWorldMeasureIdPhase !== "awaiting-executive"
  );
}

/** Legacy line 382: !window || next.currentDate <= window.lastActionDate */
export function openPresidentBillMatterRule2(facts: {
  readonly window: unknown;
  readonly nextCurrentDate: string;
  readonly windowLastActionDate: string;
}) {
  return !facts.window || facts.nextCurrentDate <= facts.windowLastActionDate;
}

/** Legacy line 384: m.measureId === measure.id && m.status === "open" */
export function openPresidentBillMatterRule3(facts: {
  readonly mMeasureId: string | null;
  readonly measureId: string;
  readonly mStatus: string;
}) {
  return facts.mMeasureId! === facts.measureId && facts.mStatus === "open";
}
