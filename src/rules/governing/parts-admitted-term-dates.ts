// STOPGAP RULES3-GOV-076: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/nationwide-world/state-executive-terms.ts :: admittedTermDates.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 153: unknownFields.length > 0 */
export function admittedTermDatesRule1(facts: {
  readonly unknownFieldsLength: number;
}) {
  return facts.unknownFieldsLength > 0;
}

/** Legacy line 158: start.value !== null && typeof start.value === "object"       ? (start.value as {           kind?: unknown;           referenceStart?: unknown;           cycleYears?: unknown;         })       : null */
export function admittedTermDatesRule2(facts: {
  readonly startValue: unknown;
  readonly startValueAsKindUnknownReferenceStartUnknownCycleYearsUnknown: unknown;
}) {
  return facts.startValue !== null && typeof facts.startValue === "object"
    ? facts.startValueAsKindUnknownReferenceStartUnknownCycleYearsUnknown
    : null;
}

/** Legacy line 165: duration === null || shape === null */
export function admittedTermDatesRule3(facts: {
  readonly duration: number | null;
  readonly shape: unknown;
}) {
  return facts.duration! === null || facts.shape === null;
}

/** Legacy line 166: Number(electionDate.slice(0, 4)) */
export function admittedTermDatesRule4(facts: {
  readonly electionDateSlice04: string;
}) {
  return Number(facts.electionDateSlice04);
}

/** Legacy line 168: shape.kind === "january-first-following-election" */
export function admittedTermDatesRule5(facts: { readonly shapeKind: unknown }) {
  return facts.shapeKind === "january-first-following-election";
}

/** Legacy line 169: electionYear + 1 */
export function admittedTermDatesRule6(facts: {
  readonly electionYear: number;
}) {
  return facts.electionYear + 1;
}

/** Legacy line 170: shape.kind === "reference-start" */
export function admittedTermDatesRule7(facts: { readonly shapeKind: unknown }) {
  return facts.shapeKind === "reference-start";
}

/** Legacy line 174: cycle !== null &&       typeof reference === "string" &&       /^\d{4}-\d{2}-\d{2}$/.test(reference) */
export function admittedTermDatesRule8(facts: {
  readonly cycle: number | null;
  readonly reference: unknown;
  readonly d4D2D2$TestReference: boolean;
}) {
  return (
    facts.cycle! !== null &&
    typeof facts.reference === "string" &&
    facts.d4D2D2$TestReference
  );
}

/** Legacy line 179: Number(reference.slice(0, 4)) */
export function admittedTermDatesRule9(facts: {
  readonly referenceSlice04: string;
}) {
  return Number(facts.referenceSlice04);
}

/** Legacy line 181: referenceYear +         Math.ceil((electionYear - referenceYear) / cycle) * cycle */
export function admittedTermDatesRule10(facts: {
  readonly referenceYear: number;
  readonly electionYear: number;
  readonly cycle: number;
}) {
  return (
    facts.referenceYear +
    Math.ceil((facts.electionYear - facts.referenceYear) / facts.cycle) *
      facts.cycle
  );
}

/** Legacy line 183: `${year}${monthDay}` <= electionDate */
export function admittedTermDatesRule11(facts: {
  readonly year: number;
  readonly monthDay: string;
  readonly electionDate: string;
}) {
  return `${facts.year}${facts.monthDay}` <= facts.electionDate;
}

/** Legacy line 183: year += cycle */
export function admittedTermDatesRule12(facts: {
  readonly year: number;
  readonly cycle: number;
}) {
  return facts.year + facts.cycle;
}

/** Legacy line 187: startsAt === null */
export function admittedTermDatesRule13(facts: {
  readonly startsAt: string | null;
}) {
  return facts.startsAt! === null;
}

/** Legacy line 188: Number(startsAt.slice(0, 4)) */
export function admittedTermDatesRule14(facts: {
  readonly startsAtSlice04: string;
}) {
  return Number(facts.startsAtSlice04);
}

/** Legacy line 192: startYear + duration */
export function admittedTermDatesRule15(facts: {
  readonly startYear: number;
  readonly duration: number;
}) {
  return facts.startYear + facts.duration;
}
