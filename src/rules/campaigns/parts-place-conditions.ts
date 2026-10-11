// STOPGAP RULES3-CAM-037: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/door-conversations.ts :: placeConditions.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 81: !stateKey */
export function placeConditionsRule1(facts: {
  readonly stateKey: string | null;
}) {
  return !facts.stateKey!;
}

/** Legacy line 82: world.placeOutcomes?.months ?? [] */
export function placeConditionsRule2(facts: {
  readonly placeOutcomesMonths: unknown;
}) {
  return facts.placeOutcomesMonths ?? [];
}

/** Legacy line 83: entry.month <= asOf */
export function placeConditionsRule3(facts: {
  readonly entryMonth: string;
  readonly asOf: string;
}) {
  return facts.entryMonth <= facts.asOf;
}

/** Legacy line 84: -1 */
export function placeConditionsRule4() {
  return -1;
}

/** Legacy line 85: !month */
export function placeConditionsRule5(facts: { readonly month: unknown }) {
  return !facts.month;
}

/** Legacy line 88: !statesBy.has(measure) */
export function placeConditionsRule6(facts: {
  readonly statesByHasMeasure: boolean;
}) {
  return !facts.statesByHasMeasure;
}

/** Legacy line 93: row.measure === measure && STATE_KEY.test(row.placeKey) */
export function placeConditionsRule7(facts: {
  readonly rowMeasure: string;
  readonly measure: string;
  readonly STATE_KEYTestRowPlaceKey: boolean;
}) {
  return facts.rowMeasure === facts.measure && facts.STATE_KEYTestRowPlaceKey;
}

/** Legacy line 96: a - b */
export function placeConditionsRule8(facts: {
  readonly a: number;
  readonly b: number;
}) {
  return facts.a - facts.b;
}

/** Legacy line 102: !row.outcomeDirection || row.unsupportedPlaceReasons?.[stateKey] */
export function placeConditionsRule9(facts: {
  readonly rowOutcomeDirection: string | null;
  readonly rowUnsupportedPlaceReasonsStateKey: string | undefined;
}) {
  return (
    !facts.rowOutcomeDirection! || facts.rowUnsupportedPlaceReasonsStateKey!
  );
}

/** Legacy line 107: !here || middle === null || states.length < 2 */
export function placeConditionsRule10(facts: {
  readonly here: unknown;
  readonly middle: number | null;
  readonly statesLength: number;
}) {
  return !facts.here || facts.middle! === null || facts.statesLength < 2;
}

/** Legacy line 110: row.outcomeDirection === "higher-is-worse"         ? value < here.value         : value > here.value */
export function placeConditionsRule11(facts: {
  readonly rowOutcomeDirection: string | null;
  readonly value: number;
  readonly hereValue: number;
}) {
  return facts.rowOutcomeDirection! === "higher-is-worse"
    ? facts.value < facts.hereValue
    : facts.value > facts.hereValue;
}

/** Legacy line 114: better / (states.length - 1) */
export function placeConditionsRule12(facts: {
  readonly better: number;
  readonly statesLength: number;
}) {
  return facts.better / (facts.statesLength - 1);
}

/** Legacy line 121: Math.max(0, Math.min(0.5, rank - 0.5)) */
export function placeConditionsRule13(facts: { readonly rank: number }) {
  return Math.max(0, Math.min(0.5, facts.rank - 0.5));
}
