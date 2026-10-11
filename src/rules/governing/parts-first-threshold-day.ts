// STOPGAP RULES3-GOV-031: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/hazard.ts :: firstThresholdDay.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 171: Number(to.slice(0, 4)) <       Number(profile.birthDate.slice(0, 4)) + CROSSING_HORIZON_AGE ||     to <= dateAtAge(profile.birthDate, CROSSING_HORIZON_AGE) */
export function firstThresholdDayRule1(facts: {
  readonly toSlice04: string;
  readonly profileBirthDateSlice04: string;
  readonly CROSSING_HORIZON_AGE: number;
  readonly to: string;
  readonly dateAtAgeProfileBirthDateCROSSING_HORIZON_AGE: string;
}) {
  return (
    Number(facts.toSlice04) <
      Number(facts.profileBirthDateSlice04) + facts.CROSSING_HORIZON_AGE ||
    facts.to <= facts.dateAtAgeProfileBirthDateCROSSING_HORIZON_AGE
  );
}

/** Legacy line 174: from < profile.exposureStart || !inside */
export function firstThresholdDayRule2(facts: {
  readonly from: string;
  readonly profileExposureStart: string;
  readonly inside: boolean;
}) {
  return facts.from < facts.profileExposureStart || !facts.inside;
}

/** Legacy line 178: crossing === undefined */
export function firstThresholdDayRule3(facts: {
  readonly crossing: string | null | undefined;
}) {
  return facts.crossing! === undefined;
}

/** Legacy line 185: CROSSINGS.size >= CROSSING_LIMIT */
export function firstThresholdDayRule4(facts: {
  readonly CROSSINGSSize: number;
  readonly CROSSING_LIMIT: number;
}) {
  return facts.CROSSINGSSize >= facts.CROSSING_LIMIT;
}

/** Legacy line 190: crossing === null */
export function firstThresholdDayRule5(facts: {
  readonly crossing: string | null;
}) {
  return facts.crossing! === null;
}

/** Legacy line 191: crossing <= from */
export function firstThresholdDayRule6(facts: {
  readonly crossing: string;
  readonly from: string;
}) {
  return facts.crossing <= facts.from;
}

/** Legacy line 192: crossing < to ? crossing : null */
export function firstThresholdDayRule7(facts: {
  readonly crossing: string;
  readonly to: string;
}) {
  return facts.crossing < facts.to ? facts.crossing : null;
}
