// STOPGAP RULES3-CAM-023: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-polling.ts :: surveyWorkDays.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 66: !first */
export function surveyWorkDaysRule1(facts: { readonly first: unknown }) {
  return !facts.first;
}

/** Legacy line 69: status.effectiveAt >= first.effectiveAt && status.status === "ended" */
export function surveyWorkDaysRule2(facts: {
  readonly statusEffectiveAt: string;
  readonly firstEffectiveAt: string;
  readonly statusStatus: string;
}) {
  return (
    facts.statusEffectiveAt >= facts.firstEffectiveAt &&
    facts.statusStatus === "ended"
  );
}

/** Legacy line 72: ended && ended.effectiveAt < world.currentDate         ? ended.effectiveAt         : world.currentDate */
export function surveyWorkDaysRule3(facts: {
  readonly ended: unknown;
  readonly endedEffectiveAt: string;
  readonly currentDate: string;
}) {
  return facts.ended && facts.endedEffectiveAt < facts.currentDate
    ? facts.endedEffectiveAt
    : facts.currentDate;
}

/** Legacy line 75: until > first.effectiveAt */
export function surveyWorkDaysRule4(facts: {
  readonly until: string;
  readonly firstEffectiveAt: string;
}) {
  return facts.until > facts.firstEffectiveAt;
}

/** Legacy line 76: total += daysBetween(first.effectiveAt, until) */
export function surveyWorkDaysRule5(facts: {
  readonly total: number;
  readonly daysBetweenFirstEffectiveAtUntil: number;
}) {
  return facts.total + facts.daysBetweenFirstEffectiveAtUntil;
}
