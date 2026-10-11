// STOPGAP RULES3-GOV-030: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/hazard.ts :: segments.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 85: from < profile.birthDate ? profile.birthDate : from */
export function segmentsRule1(facts: {
  readonly from: string;
  readonly profileBirthDate: string;
}) {
  return facts.from < facts.profileBirthDate
    ? facts.profileBirthDate
    : facts.from;
}

/** Legacy line 86: cursor < to */
export function segmentsRule2(facts: {
  readonly cursor: string;
  readonly to: string;
}) {
  return facts.cursor < facts.to;
}

/** Legacy line 89: age + 1 */
export function segmentsRule3(facts: { readonly age: number }) {
  return facts.age + 1;
}

/** Legacy line 90: BigInt(daysBetween(ageStart, ageEnd)) */
export function segmentsRule4(facts: {
  readonly daysBetweenAgeStartAgeEnd: number;
}) {
  return BigInt(facts.daysBetweenAgeStartAgeEnd);
}

/** Legacy line 91: ageEnd < to ? ageEnd : to */
export function segmentsRule5(facts: {
  readonly ageEnd: string;
  readonly to: string;
}) {
  return facts.ageEnd < facts.to ? facts.ageEnd : facts.to;
}

/** Legacy line 93: change !== null && change < end */
export function segmentsRule6(facts: {
  readonly change: string | null;
  readonly end: string;
}) {
  return facts.change! !== null && facts.change < facts.end;
}

/** Legacy line 94: BigInt(multiplierAt(profile, cursor)) */
export function segmentsRule7(facts: {
  readonly multiplierAtProfileCursor: number;
}) {
  return BigInt(facts.multiplierAtProfileCursor);
}

/** Legacy line 100: doubledAgeYearHazard(age, profile.category) *         micros *         (DAY_LCM / yearDays) */
export function segmentsRule8(facts: {
  readonly doubledAgeYearHazardAgeProfileCategory: bigint;
  readonly micros: bigint;
  readonly DAY_LCM: bigint;
  readonly yearDays: bigint;
}) {
  return (
    facts.doubledAgeYearHazardAgeProfileCategory *
    facts.micros *
    (facts.DAY_LCM / facts.yearDays)
  );
}
