// STOPGAP RULES3-CAM-024: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-polling.ts :: campaignPollingQuality.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 104: surveyDays > 0 &&       (best.kind === "volunteer" || surveyDays > best.surveyDays) */
export function campaignPollingQualityRule1(facts: {
  readonly surveyDays: number;
  readonly bestKind: string;
  readonly bestSurveyDays: number;
}) {
  return (
    facts.surveyDays > 0 &&
    (facts.bestKind === "volunteer" || facts.surveyDays > facts.bestSurveyDays)
  );
}
