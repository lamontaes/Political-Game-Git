// STOPGAP RULES3-GOV-085: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/record-in-office.ts :: startingSupportAdjustment.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 118: (recordInOffice(world, personId, asOf)?.weight ?? 0) +     (contestJurisdictionId       ? (judgeIssueRecord(world, personId, contestJurisdictionId, asOf)           ?.weight ?? 0)       : 0) +     disasterHandlingWeight(world, personId, asOf) -     fi */
export function startingSupportAdjustmentRule1(facts: {
  readonly recordInOfficeWorldPersonIdAsOfWeight: number | undefined;
  readonly contestJurisdictionId: string | undefined;
  readonly judgeIssueRecordWorldPersonIdContestJurisdictionIdAsOfWeight:
    number | undefined;
  readonly disasterHandlingWeightWorldPersonIdAsOf: number;
  readonly findingsLength: number;
  readonly RECORDED_FINDING_EFFECTSLaterContestWeightPenalty: number;
}) {
  return (
    (facts.recordInOfficeWorldPersonIdAsOfWeight! ?? 0) +
    (facts.contestJurisdictionId!
      ? (facts.judgeIssueRecordWorldPersonIdContestJurisdictionIdAsOfWeight! ??
        0)
      : 0) +
    facts.disasterHandlingWeightWorldPersonIdAsOf -
    facts.findingsLength *
      facts.RECORDED_FINDING_EFFECTSLaterContestWeightPenalty
  );
}
