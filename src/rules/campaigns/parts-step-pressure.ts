// STOPGAP RULES3-CAM-045: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/pressure/step.ts :: stepPressure.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 61: world.pressure ?? {     contractVersion: PRESSURE_CONTRACT_VERSION,     quartersStepped: 0,     lastPeriodEnd: null,     readings: [],     flows: [],   } */
export function stepPressureRule1(facts: {
  readonly pressure: unknown;
  readonly contractVersionPRESSURE_CONTRACT_VERSIONQuartersStepped0Last: unknown;
}) {
  return (
    facts.pressure ??
    facts.contractVersionPRESSURE_CONTRACT_VERSIONQuartersStepped0Last
  );
}

/** Legacy line 69: store.lastPeriodEnd && store.lastPeriodEnd >= periodEnd */
export function stepPressureRule2(facts: {
  readonly storeLastPeriodEnd: string | null;
  readonly periodEnd: string;
}) {
  return (
    facts.storeLastPeriodEnd! && facts.storeLastPeriodEnd >= facts.periodEnd
  );
}

/** Legacy line 76: store.lastPeriodEnd ?? addDays(periodEnd, -FIRST_PERIOD_DAYS) */
export function stepPressureRule3(facts: {
  readonly storeLastPeriodEnd: string | null;
  readonly addDaysPeriodEndFIRST_PERIOD_DAYS: string;
}) {
  return facts.storeLastPeriodEnd! ?? facts.addDaysPeriodEndFIRST_PERIOD_DAYS;
}

/** Legacy line 76: -FIRST_PERIOD_DAYS */
export function stepPressureRule4(facts: {
  readonly FIRST_PERIOD_DAYS: number;
}) {
  return -facts.FIRST_PERIOD_DAYS;
}

/** Legacy line 77: store.quartersStepped + 1 */
export function stepPressureRule5(facts: {
  readonly storeQuartersStepped: number;
}) {
  return facts.storeQuartersStepped + 1;
}

/** Legacy line 91: !counted.has(`${entry.causeKey}:${entry.sourceId}`) */
export function stepPressureRule6(facts: {
  readonly countedHas$EntryCauseKey$EntrySourceId: boolean;
}) {
  return !facts.countedHas$EntryCauseKey$EntrySourceId;
}

/** Legacy line 100: causes.get(stateKey) ?? [] */
export function stepPressureRule7(facts: {
  readonly causesGetStateKey: unknown;
}) {
  return facts.causesGetStateKey ?? [];
}

/** Legacy line 106: (before?.[kind] ?? 0) * (1 - FADE_PER_QUARTER_ESTIMATE) +             contributions               .filter((entry) => entry.kind === kind)               .reduce((sum, entry) => sum + entry.amount, 0) */
export function stepPressureRule8(facts: {
  readonly beforeKind: number | undefined;
  readonly FADE_PER_QUARTER_ESTIMATE: number;
  readonly contributionsFilterEntryEntryKindKindReduceSumEntrySumEntryA: number;
}) {
  return (
    (facts.beforeKind! ?? 0) * (1 - facts.FADE_PER_QUARTER_ESTIMATE) +
    facts.contributionsFilterEntryEntryKindKindReduceSumEntrySumEntryA
  );
}

/** Legacy line 109: sum + entry.amount */
export function stepPressureRule9(facts: {
  readonly sum: number;
  readonly entryAmount: number;
}) {
  return facts.sum + facts.entryAmount;
}

/** Legacy line 114: contributions.length === 0 &&       PRESSURE_KINDS.every((kind) => levels[kind] === 0) */
export function stepPressureRule10(facts: {
  readonly contributionsLength: number;
  readonly PRESSURE_KINDSEveryKindLevelsKind0: boolean;
}) {
  return (
    facts.contributionsLength === 0 && facts.PRESSURE_KINDSEveryKindLevelsKind0
  );
}

/** Legacy line 115: levels[kind] === 0 */
export function stepPressureRule11(facts: { readonly levelsKind: number }) {
  return facts.levelsKind === 0;
}

/** Legacy line 131: ordinal % QUARTERS_PER_FLOW_YEAR === 0 */
export function stepPressureRule12(facts: {
  readonly ordinal: number;
  readonly QUARTERS_PER_FLOW_YEAR: number;
}) {
  return facts.ordinal % facts.QUARTERS_PER_FLOW_YEAR === 0;
}

/** Legacy line 133: closesYear && current.size > 0 && states.length > 1       ? flowsForYear(           states.map((state) => state.stateKey),           current,           Number(periodEnd.slice(0, 4)),           ordinal / QUARTERS_PER_FLOW_YEAR,         )       : [] */
export function stepPressureRule13(facts: {
  readonly closesYear: boolean;
  readonly currentSize: number;
  readonly statesLength: number;
  readonly flowsForYearResult: unknown;
}) {
  return facts.closesYear && facts.currentSize > 0 && facts.statesLength > 1
    ? facts.flowsForYearResult
    : [];
}

/** Legacy line 137: Number(periodEnd.slice(0, 4)) */
export function stepPressureRule14(facts: {
  readonly periodEndSlice04: string;
}) {
  return Number(facts.periodEndSlice04);
}

/** Legacy line 138: ordinal / QUARTERS_PER_FLOW_YEAR */
export function stepPressureRule15(facts: {
  readonly ordinal: number;
  readonly QUARTERS_PER_FLOW_YEAR: number;
}) {
  return facts.ordinal / facts.QUARTERS_PER_FLOW_YEAR;
}

/** Legacy line 152: flows.length > 0 ? largestPushedFlow(readings, flows) : null */
export function stepPressureRule16(facts: {
  readonly flowsLength: number;
  readonly largestPushedFlowReadingsFlows: unknown;
}) {
  return facts.flowsLength > 0 ? facts.largestPushedFlowReadingsFlows : null;
}
