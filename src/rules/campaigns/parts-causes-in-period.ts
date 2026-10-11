// STOPGAP RULES3-CAM-042: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/pressure/causes.ts :: causesInPeriod.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 68: byState.get(stateKey) ?? [] */
export function causesInPeriodRule1(facts: {
  readonly byStateGetStateKey: unknown;
}) {
  return facts.byStateGetStateKey ?? [];
}

/** Legacy line 72: date >= periodStart && date <= periodEnd */
export function causesInPeriodRule2(facts: {
  readonly date: string;
  readonly periodStart: string;
  readonly periodEnd: string;
}) {
  return facts.date >= facts.periodStart && facts.date <= facts.periodEnd;
}

/** Legacy line 74: world.history.crisisRecords ?? [] */
export function causesInPeriodRule3(facts: {
  readonly historyCrisisRecords: unknown;
}) {
  return facts.historyCrisisRecords ?? [];
}

/** Legacy line 75: record.kind !== "hazard-episode" || !within(record.effectiveAt) */
export function causesInPeriodRule4(facts: {
  readonly recordKind: string;
  readonly withinRecordEffectiveAt: boolean;
}) {
  return (
    facts.recordKind !== "hazard-episode" || !facts.withinRecordEffectiveAt
  );
}

/** Legacy line 85: world.history.taxProposals ?? [] */
export function causesInPeriodRule5(facts: {
  readonly historyTaxProposals: unknown;
}) {
  return facts.historyTaxProposals ?? [];
}

/** Legacy line 88: world.history.taxPolicies ?? [] */
export function causesInPeriodRule6(facts: {
  readonly historyTaxPolicies: unknown;
}) {
  return facts.historyTaxPolicies ?? [];
}

/** Legacy line 91: policyId       ? proposals.get(policies.get(policyId)?.proposalId as EntityId)?.terms       : undefined */
export function causesInPeriodRule7(facts: {
  readonly policyId: string | null;
  readonly proposalsGetPoliciesGetPolicyIdProposalIdAsEntityIdTerms: unknown;
}) {
  return facts.policyId!
    ? facts.proposalsGetPoliciesGetPolicyIdProposalIdAsEntityIdTerms
    : undefined;
}

/** Legacy line 94: terms ? terms.rateNumerator / terms.rateDenominator : 0 */
export function causesInPeriodRule8(facts: {
  readonly terms: unknown;
  readonly termsRateNumerator: number;
  readonly termsRateDenominator: number;
}) {
  return facts.terms
    ? facts.termsRateNumerator / facts.termsRateDenominator
    : 0;
}

/** Legacy line 96: world.history.taxPolicies ?? [] */
export function causesInPeriodRule9(facts: {
  readonly historyTaxPolicies: unknown;
}) {
  return facts.historyTaxPolicies ?? [];
}

/** Legacy line 97: !within(policy.effectiveAt) || policy.recordedAt > world.currentDate */
export function causesInPeriodRule10(facts: {
  readonly withinPolicyEffectiveAt: boolean;
  readonly policyRecordedAt: string;
  readonly currentDate: string;
}) {
  return (
    !facts.withinPolicyEffectiveAt || facts.policyRecordedAt > facts.currentDate
  );
}

/** Legacy line 100: proposal       ? world.jurisdictions[proposal.jurisdictionId]       : undefined */
export function causesInPeriodRule11(facts: {
  readonly proposal: unknown;
  readonly jurisdictionsProposalJurisdictionId: unknown;
}) {
  return facts.proposal ? facts.jurisdictionsProposalJurisdictionId : undefined;
}

/** Legacy line 103: jurisdiction       ? stateKeyForJurisdiction(jurisdiction)       : null */
export function causesInPeriodRule12(facts: {
  readonly jurisdiction: unknown;
  readonly stateKeyForJurisdictionJurisdiction: string | null;
}) {
  return facts.jurisdiction ? facts.stateKeyForJurisdictionJurisdiction! : null;
}

/** Legacy line 106: !proposal || !stateKey */
export function causesInPeriodRule13(facts: {
  readonly proposal: unknown;
  readonly stateKey: string | null;
}) {
  return !facts.proposal || !facts.stateKey!;
}

/** Legacy line 108: proposal.terms.rateNumerator / proposal.terms.rateDenominator -       rateOf(policy.supersedesPolicyId) */
export function causesInPeriodRule14(facts: {
  readonly proposalTermsRateNumerator: number;
  readonly proposalTermsRateDenominator: number;
  readonly rateOfPolicySupersedesPolicyId: number;
}) {
  return (
    facts.proposalTermsRateNumerator / facts.proposalTermsRateDenominator -
    facts.rateOfPolicySupersedesPolicyId
  );
}

/** Legacy line 110: change === 0 */
export function causesInPeriodRule15(facts: { readonly change: number }) {
  return facts.change === 0;
}

/** Legacy line 113: change > 0 ? "leave" : "arrive" */
export function causesInPeriodRule16(facts: { readonly change: number }) {
  return facts.change > 0 ? "leave" : "arrive";
}

/** Legacy line 114: Math.abs(change) * TAX_RATE_PRESSURE_ESTIMATE */
export function causesInPeriodRule17(facts: {
  readonly change: number;
  readonly TAX_RATE_PRESSURE_ESTIMATE: number;
}) {
  return Math.abs(facts.change) * facts.TAX_RATE_PRESSURE_ESTIMATE;
}

/** Legacy line 121: (Date.parse(periodEnd) - Date.parse(periodStart)) / 86_400_000 + 1 */
export function causesInPeriodRule18(facts: {
  readonly periodEnd: string;
  readonly periodStart: string;
}) {
  return (
    (Date.parse(facts.periodEnd) - Date.parse(facts.periodStart)) / 86400000 + 1
  );
}

/** Legacy line 122: Math.round(     (TOWN_POLICE_LOG.reportedPerMonth * periodDays * 12) / 365.25,   ) */
export function causesInPeriodRule19(facts: {
  readonly TOWN_POLICE_LOGReportedPerMonth: number;
  readonly periodDays: number;
}) {
  return Math.round(
    (facts.TOWN_POLICE_LOGReportedPerMonth * facts.periodDays * 12) / 365.25,
  );
}

/** Legacy line 127: event.type !== CRIME_EVENT_TYPES.reported || !within(event.occurredAt) */
export function causesInPeriodRule20(facts: {
  readonly eventType: string;
  readonly CRIME_EVENT_TYPESReported: string;
  readonly withinEventOccurredAt: boolean;
}) {
  return (
    facts.eventType !== facts.CRIME_EVENT_TYPESReported ||
    !facts.withinEventOccurredAt
  );
}

/** Legacy line 129: !event.jurisdictionId */
export function causesInPeriodRule21(facts: {
  readonly eventJurisdictionId: string | null;
}) {
  return !facts.eventJurisdictionId!;
}

/** Legacy line 130: reportedByTown.get(event.jurisdictionId) ?? [] */
export function causesInPeriodRule22(facts: {
  readonly reportedByTownGetEventJurisdictionId: unknown;
}) {
  return facts.reportedByTownGetEventJurisdictionId ?? [];
}

/** Legacy line 137: lifePlaceByJurisdictionId(townId)?.stateJurisdictionKey ?? null */
export function causesInPeriodRule23(facts: {
  readonly lifePlaceByJurisdictionIdTownIdStateJurisdictionKey:
    string | null | undefined;
}) {
  return facts.lifePlaceByJurisdictionIdTownIdStateJurisdictionKey! ?? null;
}

/** Legacy line 138: !stateKey */
export function causesInPeriodRule24(facts: {
  readonly stateKey: string | null;
}) {
  return !facts.stateKey!;
}

/** Legacy line 141: a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id) */
export function causesInPeriodRule25(facts: {
  readonly aOccurredAtLocaleCompareBOccurredAt: number;
  readonly aIdLocaleCompareBId: number;
}) {
  return facts.aOccurredAtLocaleCompareBOccurredAt || facts.aIdLocaleCompareBId;
}

/** Legacy line 145: !offense */
export function causesInPeriodRule26(facts: {
  readonly offense: string | null;
}) {
  return !facts.offense!;
}

/** Legacy line 158: world.macroEconomy?.months ?? [] */
export function causesInPeriodRule27(facts: {
  readonly macroEconomyMonths: unknown;
}) {
  return facts.macroEconomyMonths ?? [];
}

/** Legacy line 161: row.scope === "national" */
export function causesInPeriodRule28(facts: { readonly rowScope: string }) {
  return facts.rowScope === "national";
}

/** Legacy line 166: row.scope === "national" || !within(row.recordedAt) */
export function causesInPeriodRule29(facts: {
  readonly rowScope: string;
  readonly withinRowRecordedAt: boolean;
}) {
  return facts.rowScope === "national" || !facts.withinRowRecordedAt;
}

/** Legacy line 172: jurisdiction?.kind !== "state-placeholder" */
export function causesInPeriodRule30(facts: {
  readonly jurisdictionKind: string | undefined;
}) {
  return facts.jurisdictionKind! !== "state-placeholder";
}

/** Legacy line 175: !stateKey || !nation */
export function causesInPeriodRule31(facts: {
  readonly stateKey: string | null;
  readonly nation: unknown;
}) {
  return !facts.stateKey! || !facts.nation;
}

/** Legacy line 176: row.unemploymentPct - nation.unemploymentPct */
export function causesInPeriodRule32(facts: {
  readonly rowUnemploymentPct: number;
  readonly nationUnemploymentPct: number;
}) {
  return facts.rowUnemploymentPct - facts.nationUnemploymentPct;
}

/** Legacy line 177: gap === 0 */
export function causesInPeriodRule33(facts: { readonly gap: number }) {
  return facts.gap === 0;
}

/** Legacy line 180: gap > 0 ? "leave" : "arrive" */
export function causesInPeriodRule34(facts: { readonly gap: number }) {
  return facts.gap > 0 ? "leave" : "arrive";
}

/** Legacy line 181: Math.abs(gap) * UNEMPLOYMENT_GAP_PRESSURE_ESTIMATE */
export function causesInPeriodRule35(facts: {
  readonly gap: number;
  readonly UNEMPLOYMENT_GAP_PRESSURE_ESTIMATE: number;
}) {
  return Math.abs(facts.gap) * facts.UNEMPLOYMENT_GAP_PRESSURE_ESTIMATE;
}

/** Legacy line 191: jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null */
export function causesInPeriodRule36(facts: {
  readonly jurisdiction: unknown;
  readonly stateKeyForJurisdictionJurisdiction: string | null;
}) {
  return facts.jurisdiction ? facts.stateKeyForJurisdictionJurisdiction! : null;
}

/** Legacy line 192: key ? [key] : [] */
export function causesInPeriodRule37(facts: {
  readonly key: string | null;
  readonly key2: string[];
}) {
  return facts.key! ? facts.key2 : [];
}
