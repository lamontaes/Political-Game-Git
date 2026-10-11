// STOPGAP RULES3-GOV-030: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/hazard.ts :: cumulativeHazardUnits.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 130: end <= profile.exposureStart */
export function cumulativeHazardUnitsRule1(facts: {
  readonly end: string;
  readonly profileExposureStart: string;
}) {
  return facts.end <= facts.profileExposureStart;
}

/** Legacy line 135: checkpoint && checkpoint.until <= end */
export function cumulativeHazardUnitsRule2(facts: {
  readonly checkpoint: unknown;
  readonly checkpointUntil: string;
  readonly end: string;
}) {
  return facts.checkpoint && facts.checkpointUntil <= facts.end;
}

/** Legacy line 140: total += segment.perDay * BigInt(segment.days) */
export function cumulativeHazardUnitsRule3(facts: {
  readonly total: bigint;
  readonly segmentPerDay: bigint;
  readonly segmentDays: number;
}) {
  return facts.total + facts.segmentPerDay * BigInt(facts.segmentDays);
}

/** Legacy line 141: !checkpoint || checkpoint.until < end */
export function cumulativeHazardUnitsRule4(facts: {
  readonly checkpoint: unknown;
  readonly checkpointUntil: string;
  readonly end: string;
}) {
  return !facts.checkpoint || facts.checkpointUntil < facts.end;
}

/** Legacy line 142: CHECKPOINTS.size >= CHECKPOINT_LIMIT */
export function cumulativeHazardUnitsRule5(facts: {
  readonly CHECKPOINTSSize: number;
  readonly CHECKPOINT_LIMIT: number;
}) {
  return facts.CHECKPOINTSSize >= facts.CHECKPOINT_LIMIT;
}
