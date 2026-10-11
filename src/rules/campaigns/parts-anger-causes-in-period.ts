// STOPGAP RULES3-CAM-041: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/pressure/anger.ts :: angerCausesInPeriod.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 74: byState.get(stateKey) ?? [] */
export function angerCausesInPeriodRule1(facts: {
  readonly byStateGetStateKey: unknown;
}) {
  return facts.byStateGetStateKey ?? [];
}

/** Legacy line 78: date >= periodStart && date <= periodEnd */
export function angerCausesInPeriodRule2(facts: {
  readonly date: string;
  readonly periodStart: string;
  readonly periodEnd: string;
}) {
  return facts.date >= facts.periodStart && facts.date <= facts.periodEnd;
}

/** Legacy line 82: record.kind === "hazard-episode" ? [[record.id, record] as const] : [] */
export function angerCausesInPeriodRule3(facts: {
  readonly recordKind: string;
  readonly recordIdRecordAsConst: unknown[];
}) {
  return facts.recordKind === "hazard-episode"
    ? facts.recordIdRecordAsConst
    : [];
}

/** Legacy line 87: record.kind === "disaster-response" && within(record.effectiveAt) */
export function angerCausesInPeriodRule4(facts: {
  readonly recordKind: string;
  readonly withinRecordEffectiveAt: boolean;
}) {
  return (
    facts.recordKind === "disaster-response" && facts.withinRecordEffectiveAt
  );
}

/** Legacy line 88: handlingVerdict(world, record) !== "failed" */
export function angerCausesInPeriodRule5(facts: {
  readonly handlingVerdictWorldRecord: string | null;
}) {
  return facts.handlingVerdictWorldRecord! !== "failed";
}

/** Legacy line 90: !episode */
export function angerCausesInPeriodRule6(facts: { readonly episode: unknown }) {
  return !facts.episode;
}

/** Legacy line 98: record.kind === "violence-attempt" &&       within(record.effectiveAt) */
export function angerCausesInPeriodRule7(facts: {
  readonly recordKind: string;
  readonly withinRecordEffectiveAt: boolean;
}) {
  return (
    facts.recordKind === "violence-attempt" && facts.withinRecordEffectiveAt
  );
}

/** Legacy line 102: !stateKey */
export function angerCausesInPeriodRule8(facts: {
  readonly stateKey: string | null;
}) {
  return !facts.stateKey!;
}

/** Legacy line 119: release.scope === "national" && release.value !== null */
export function angerCausesInPeriodRule9(facts: {
  readonly releaseScope: string;
  readonly releaseValue: number | null;
}) {
  return facts.releaseScope === "national" && facts.releaseValue! !== null;
}

/** Legacy line 122: -1 */
export function angerCausesInPeriodRule10() {
  return -1;
}

/** Legacy line 124: release.releasedAt < periodStart */
export function angerCausesInPeriodRule11(facts: {
  readonly releaseReleasedAt: string;
  readonly periodStart: string;
}) {
  return facts.releaseReleasedAt < facts.periodStart;
}

/** Legacy line 125: -1 */
export function angerCausesInPeriodRule12() {
  return -1;
}

/** Legacy line 126: latest && prior ? latest.value! - prior.value! : 0 */
export function angerCausesInPeriodRule13(facts: {
  readonly latest: unknown;
  readonly prior: unknown;
  readonly latestValue: number;
  readonly priorValue: number;
}) {
  return facts.latest && facts.prior ? facts.latestValue - facts.priorValue : 0;
}

/** Legacy line 127: latest && rise > 0 */
export function angerCausesInPeriodRule14(facts: {
  readonly latest: unknown;
  readonly rise: number;
}) {
  return facts.latest && facts.rise > 0;
}

/** Legacy line 129: Math.round(rise * UNEMPLOYMENT_RISE_ANGER_ESTIMATE * 10000) / 10000 */
export function angerCausesInPeriodRule15(facts: {
  readonly rise: number;
  readonly UNEMPLOYMENT_RISE_ANGER_ESTIMATE: number;
}) {
  return (
    Math.round(facts.rise * facts.UNEMPLOYMENT_RISE_ANGER_ESTIMATE * 10000) /
    10000
  );
}
