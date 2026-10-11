// STOPGAP RULES3-GOV-027: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/hazard-producer.ts :: hazardSampleHandler.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 449: dueItem.transitionKey !== HAZARD_SAMPLE_TRANSITION_KEY */
export function hazardSampleHandlerRule1(facts: {
  readonly dueItemTransitionKey: string;
  readonly HAZARD_SAMPLE_TRANSITION_KEY: string;
}) {
  return facts.dueItemTransitionKey !== facts.HAZARD_SAMPLE_TRANSITION_KEY;
}

/** Legacy line 455: Number(     addDays(firstOfNextMonth(addDays(monthStart, 1)), -1).slice(8, 10),   ) */
export function hazardSampleHandlerRule2(facts: {
  readonly addDaysFirstOfNextMonthAddDaysMonthStart11Slice810: string;
}) {
  return Number(facts.addDaysFirstOfNextMonthAddDaysMonthStart11Slice810);
}

/** Legacy line 456: -1 */
export function hazardSampleHandlerRule3() {
  return -1;
}

/** Legacy line 462: !FELT_AS_DISASTER.has(sample.magnitude) */
export function hazardSampleHandlerRule4(facts: {
  readonly FELT_AS_DISASTERHasSampleMagnitude: boolean;
}) {
  return !facts.FELT_AS_DISASTERHasSampleMagnitude;
}

/** Legacy line 465: Math.min(Math.max(1, sample.dayOfMonth), lastDay) */
export function hazardSampleHandlerRule5(facts: {
  readonly sampleDayOfMonth: number;
  readonly lastDay: number;
}) {
  return Math.min(Math.max(1, facts.sampleDayOfMonth), facts.lastDay);
}

/** Legacy line 468: String(day) */
export function hazardSampleHandlerRule6(facts: { readonly day: number }) {
  return String(facts.day);
}

/** Legacy line 470: arrives <= next.currentDate */
export function hazardSampleHandlerRule7(facts: {
  readonly arrives: string;
  readonly nextCurrentDate: string;
}) {
  return facts.arrives <= facts.nextCurrentDate;
}

/** Legacy line 485: declared += 1 */
export function hazardSampleHandlerRule8(facts: { readonly declared: number }) {
  return facts.declared + 1;
}

/** Legacy line 490: areas.length > 0 */
export function hazardSampleHandlerRule9(facts: {
  readonly areasLength: number;
}) {
  return facts.areasLength > 0;
}

/** Legacy line 509: declared === 0 ? "crisis:no-hazard-this-month" : "crisis:hazard-sampled" */
export function hazardSampleHandlerRule10(facts: {
  readonly declared: number;
}) {
  return facts.declared === 0
    ? "crisis:no-hazard-this-month"
    : "crisis:hazard-sampled";
}
