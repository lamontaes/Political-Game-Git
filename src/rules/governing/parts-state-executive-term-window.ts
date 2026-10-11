// STOPGAP RULES3-GOV-077: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/nationwide-world/state-executives.ts :: stateExecutiveTermWindow.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 132: unknownFields.length > 0 */
export function stateExecutiveTermWindowRule1(facts: {
  readonly unknownFieldsLength: number;
}) {
  return facts.unknownFieldsLength > 0;
}

/** Legacy line 137: options.gameCalendar === false         ? null         : stateExecutiveTermRule(office.stateUsps) */
export function stateExecutiveTermWindowRule2(facts: {
  readonly optionsGameCalendar: boolean | undefined;
  readonly stateExecutiveTermRuleOfficeStateUsps: unknown;
}) {
  return facts.optionsGameCalendar! === false
    ? null
    : facts.stateExecutiveTermRuleOfficeStateUsps;
}

/** Legacy line 154: start?.value !== null && typeof start?.value === "object"       ? (start.value as {           kind?: unknown;           referenceStart?: unknown;           cycleYears?: unknown;         })       : null */
export function stateExecutiveTermWindowRule3(facts: {
  readonly startValue: unknown;
  readonly startValueAsKindUnknownReferenceStartUnknownCycleYearsUnknown: unknown;
}) {
  return facts.startValue !== null && typeof facts.startValue === "object"
    ? facts.startValueAsKindUnknownReferenceStartUnknownCycleYearsUnknown
    : null;
}

/** Legacy line 164: unknownFields.length > 0 ||     duration === null ||     shape?.kind !== "reference-start" ||     cycle === null ||     typeof reference !== "string" ||     !/^\d{4}-\d{2}-\d{2}$/.test(reference) */
export function stateExecutiveTermWindowRule4(facts: {
  readonly unknownFieldsLength: number;
  readonly duration: number | null;
  readonly shapeKind: unknown;
  readonly cycle: number | null;
  readonly reference: unknown;
  readonly d4D2D2$TestReference: boolean;
}) {
  return (
    facts.unknownFieldsLength > 0 ||
    facts.duration! === null ||
    facts.shapeKind !== "reference-start" ||
    facts.cycle! === null ||
    typeof facts.reference !== "string" ||
    !facts.d4D2D2$TestReference
  );
}

/** Legacy line 175: unknownFields.length > 0 ? unknownFields : ["term.start"] */
export function stateExecutiveTermWindowRule5(facts: {
  readonly unknownFieldsLength: number;
  readonly unknownFields: unknown[];
  readonly termStart: string[];
}) {
  return facts.unknownFieldsLength > 0 ? facts.unknownFields : facts.termStart;
}

/** Legacy line 179: Number(reference.slice(0, 4)) */
export function stateExecutiveTermWindowRule6(facts: {
  readonly referenceSlice04: string;
}) {
  return Number(facts.referenceSlice04);
}

/** Legacy line 180: Number(onDate.slice(0, 4)) */
export function stateExecutiveTermWindowRule7(facts: {
  readonly onDateSlice04: string;
}) {
  return Number(facts.onDateSlice04);
}

/** Legacy line 182: referenceYear + Math.floor((onYear - referenceYear) / cycle) * cycle */
export function stateExecutiveTermWindowRule8(facts: {
  readonly referenceYear: number;
  readonly onYear: number;
  readonly cycle: number;
}) {
  return (
    facts.referenceYear +
    Math.floor((facts.onYear - facts.referenceYear) / facts.cycle) * facts.cycle
  );
}

/** Legacy line 183: `${startYear}${monthDay}` > onDate */
export function stateExecutiveTermWindowRule9(facts: {
  readonly startYear: number;
  readonly monthDay: string;
  readonly onDate: string;
}) {
  return `${facts.startYear}${facts.monthDay}` > facts.onDate;
}

/** Legacy line 183: startYear -= cycle */
export function stateExecutiveTermWindowRule10(facts: {
  readonly startYear: number;
  readonly cycle: number;
}) {
  return facts.startYear - facts.cycle;
}

/** Legacy line 186: startYear + duration */
export function stateExecutiveTermWindowRule11(facts: {
  readonly startYear: number;
  readonly duration: number;
}) {
  return facts.startYear + facts.duration;
}
