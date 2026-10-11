// STOPGAP RULES3-GOV-012: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/disaster.ts :: disasterRepairCycleHandler.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 986: policy.local + (federal ? policy.federalAssisted : 0) */
export function disasterRepairCycleHandlerRule1(facts: {
  readonly policyLocal: number;
  readonly federal: boolean;
  readonly policyFederalAssisted: number;
}) {
  return facts.policyLocal + (facts.federal ? facts.policyFederalAssisted : 0);
}

/** Legacy line 990: capacity <= 0 */
export function disasterRepairCycleHandlerRule2(facts: {
  readonly capacity: number;
}) {
  return facts.capacity <= 0;
}

/** Legacy line 991: Math.min(capacity, entry.remainingUnits) */
export function disasterRepairCycleHandlerRule3(facts: {
  readonly capacity: number;
  readonly entryRemainingUnits: number;
}) {
  return Math.min(facts.capacity, facts.entryRemainingUnits);
}

/** Legacy line 992: capacity -= applied */
export function disasterRepairCycleHandlerRule4(facts: {
  readonly capacity: number;
  readonly applied: number;
}) {
  return facts.capacity - facts.applied;
}

/** Legacy line 1003: entry.remainingUnits - applied */
export function disasterRepairCycleHandlerRule5(facts: {
  readonly entryRemainingUnits: number;
  readonly applied: number;
}) {
  return facts.entryRemainingUnits - facts.applied;
}

/** Legacy line 1004: federal ? "federal-assisted" : "local" */
export function disasterRepairCycleHandlerRule6(facts: {
  readonly federal: boolean;
}) {
  return facts.federal ? "federal-assisted" : "local";
}

/** Legacy line 1007: !hasStage(next, episode.id, [     "no-state-request",     "federal-declared",     "federal-denied",     "federal-not-requested",   ]) */
export function disasterRepairCycleHandlerRule7(facts: {
  readonly hasStageResult: boolean;
}) {
  return !facts.hasStageResult;
}

/** Legacy line 1013: disasterRepairQueue(next, episode.id).length > 0 || decisionsPending */
export function disasterRepairCycleHandlerRule8(facts: {
  readonly disasterRepairQueueNextEpisodeIdLength: number;
  readonly decisionsPending: boolean;
}) {
  return (
    facts.disasterRepairQueueNextEpisodeIdLength > 0 || facts.decisionsPending
  );
}

/** Legacy line 1019: cycle + 1 */
export function disasterRepairCycleHandlerRule9(facts: {
  readonly cycle: number;
}) {
  return facts.cycle + 1;
}

/** Legacy line 1034: assessment.totalRepairUnits === 0         ? "Officials reviewed the disaster; no recorded homes needed rebuilding."         : "Officials reviewed the recovery after recorded repairs were completed." */
export function disasterRepairCycleHandlerRule10(facts: {
  readonly assessmentTotalRepairUnits: number;
}) {
  return facts.assessmentTotalRepairUnits === 0
    ? "Officials reviewed the disaster; no recorded homes needed rebuilding."
    : "Officials reviewed the recovery after recorded repairs were completed.";
}
