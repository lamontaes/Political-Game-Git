// STOPGAP RULES3-GOV-032: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/hazard.ts :: scanThresholdDay.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 201: from < profile.exposureStart ? profile.exposureStart : from */
export function scanThresholdDayRule1(facts: {
  readonly from: string;
  readonly profileExposureStart: string;
}) {
  return facts.from < facts.profileExposureStart
    ? facts.profileExposureStart
    : facts.from;
}

/** Legacy line 203: total >= thresholdHazardUnits */
export function scanThresholdDayRule2(facts: {
  readonly total: bigint;
  readonly thresholdHazardUnits: bigint;
}) {
  return facts.total >= facts.thresholdHazardUnits;
}

/** Legacy line 205: total + segment.perDay * BigInt(segment.days) */
export function scanThresholdDayRule3(facts: {
  readonly total: bigint;
  readonly segmentPerDay: bigint;
  readonly segmentDays: number;
}) {
  return facts.total + facts.segmentPerDay * BigInt(facts.segmentDays);
}

/** Legacy line 206: after >= thresholdHazardUnits && segment.perDay > 0n */
export function scanThresholdDayRule4(facts: {
  readonly after: bigint;
  readonly thresholdHazardUnits: bigint;
  readonly segmentPerDay: bigint;
}) {
  return facts.after >= facts.thresholdHazardUnits && facts.segmentPerDay > 0n;
}

/** Legacy line 207: thresholdHazardUnits - total */
export function scanThresholdDayRule5(facts: {
  readonly thresholdHazardUnits: bigint;
  readonly total: bigint;
}) {
  return facts.thresholdHazardUnits - facts.total;
}

/** Legacy line 209: (needed + segment.perDay - 1n) / segment.perDay - 1n */
export function scanThresholdDayRule6(facts: {
  readonly needed: bigint;
  readonly segmentPerDay: bigint;
}) {
  return (facts.needed + facts.segmentPerDay - 1n) / facts.segmentPerDay - 1n;
}

/** Legacy line 210: Number(j) */
export function scanThresholdDayRule7(facts: { readonly j: bigint }) {
  return Number(facts.j);
}
