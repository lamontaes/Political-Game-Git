// STOPGAP RULES3-GOV-037: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/executive-governing-kernels.ts :: compileExecutiveGoverningPlan.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 703: definition.row.status !== "IMPLEMENTABLE_WITH_CURRENT_MECHANICS" */
export function compileExecutiveGoverningPlanRule1(facts: {
  readonly definitionRowStatus: string;
}) {
  return facts.definitionRowStatus !== "IMPLEMENTABLE_WITH_CURRENT_MECHANICS";
}

/** Legacy line 715: (context.facts[key] ?? "").trim().length === 0 */
export function compileExecutiveGoverningPlanRule2(facts: {
  readonly contextFactsKeyTrimLength: number;
}) {
  return facts.contextFactsKeyTrimLength === 0;
}

/** Legacy line 717: missingFacts.length > 0 */
export function compileExecutiveGoverningPlanRule3(facts: {
  readonly missingFactsLength: number;
}) {
  return facts.missingFactsLength > 0;
}

/** Legacy line 726: definition.authority.kind === "supplied-canonical-fact" */
export function compileExecutiveGoverningPlanRule4(facts: {
  readonly definitionAuthorityKind: string;
}) {
  return facts.definitionAuthorityKind === "supplied-canonical-fact";
}

/** Legacy line 728: (context.facts[factKey] ?? "").trim().length === 0 */
export function compileExecutiveGoverningPlanRule5(facts: {
  readonly contextFactsFactKeyTrimLength: number;
}) {
  return facts.contextFactsFactKeyTrimLength === 0;
}

/** Legacy line 738: definition.authority.kind === "legislative-rule-pack" */
export function compileExecutiveGoverningPlanRule6(facts: {
  readonly definitionAuthorityKind: string;
}) {
  return facts.definitionAuthorityKind === "legislative-rule-pack";
}

/** Legacy line 739: !context.measure */
export function compileExecutiveGoverningPlanRule7(facts: {
  readonly contextMeasure: unknown;
}) {
  return !facts.contextMeasure;
}

/** Legacy line 759: dispositionOptions.available.length === 0 */
export function compileExecutiveGoverningPlanRule8(facts: {
  readonly dispositionOptionsAvailableLength: number;
}) {
  return facts.dispositionOptionsAvailableLength === 0;
}

/** Legacy line 768: !dispositionOptions.available.includes(context.measure.chosenOption) */
export function compileExecutiveGoverningPlanRule9(facts: {
  readonly dispositionOptionsAvailableIncludesContextMeasureChosenOption: boolean;
}) {
  return !facts.dispositionOptionsAvailableIncludesContextMeasureChosenOption;
}

/** Legacy line 770: candidate.option === context.measure?.chosenOption */
export function compileExecutiveGoverningPlanRule10(facts: {
  readonly candidateOption: string;
  readonly contextMeasureChosenOption: string | undefined;
}) {
  return facts.candidateOption === facts.contextMeasureChosenOption!;
}

/** Legacy line 776: withheld?.note ??             `${pack.displayName} does not offer '${context.measure.chosenOption}'.` */
export function compileExecutiveGoverningPlanRule11(facts: {
  readonly withheldNote: string | undefined;
  readonly packDisplayName: string;
  readonly contextMeasureChosenOption: string;
}) {
  return (
    facts.withheldNote! ??
    `${facts.packDisplayName} does not offer '${facts.contextMeasureChosenOption}'.`
  );
}

/** Legacy line 794: binding.kind === "omitted" */
export function compileExecutiveGoverningPlanRule12(facts: {
  readonly bindingKind: string;
}) {
  return facts.bindingKind === "omitted";
}

/** Legacy line 802: binding.kind === "deferred" */
export function compileExecutiveGoverningPlanRule13(facts: {
  readonly bindingKind: string;
}) {
  return facts.bindingKind === "deferred";
}

/** Legacy line 828: !focus */
export function compileExecutiveGoverningPlanRule14(facts: {
  readonly focus: unknown;
}) {
  return !facts.focus;
}

/** Legacy line 860: !slot */
export function compileExecutiveGoverningPlanRule15(facts: {
  readonly slot: unknown;
}) {
  return !facts.slot;
}

/** Legacy line 877: participants[0] ?? null */
export function compileExecutiveGoverningPlanRule16(facts: {
  readonly participants0: string | undefined;
}) {
  return facts.participants0! ?? null;
}

/** Legacy line 893: !dueAt */
export function compileExecutiveGoverningPlanRule17(facts: {
  readonly dueAt: string | undefined;
}) {
  return !facts.dueAt!;
}

/** Legacy line 953: !eventStableKey */
export function compileExecutiveGoverningPlanRule18(facts: {
  readonly eventStableKey: string | undefined;
}) {
  return !facts.eventStableKey!;
}

/** Legacy line 977: !context.measure */
export function compileExecutiveGoverningPlanRule19(facts: {
  readonly contextMeasure: unknown;
}) {
  return !facts.contextMeasure;
}

/** Legacy line 992: context.measure.chosenOption === "sign" ? "signed" : "vetoed" */
export function compileExecutiveGoverningPlanRule20(facts: {
  readonly contextMeasureChosenOption: string;
}) {
  return facts.contextMeasureChosenOption === "sign" ? "signed" : "vetoed";
}

/** Legacy line 1001: unboundRoles.length > 0 */
export function compileExecutiveGoverningPlanRule21(facts: {
  readonly unboundRolesLength: number;
}) {
  return facts.unboundRolesLength > 0;
}

/** Legacy line 1008: missingWindows.length > 0 */
export function compileExecutiveGoverningPlanRule22(facts: {
  readonly missingWindowsLength: number;
}) {
  return facts.missingWindowsLength > 0;
}

/** Legacy line 1015: missingDueDates.length > 0 */
export function compileExecutiveGoverningPlanRule23(facts: {
  readonly missingDueDatesLength: number;
}) {
  return facts.missingDueDatesLength > 0;
}

/** Legacy line 1018: missingEventAnchors.length > 0 */
export function compileExecutiveGoverningPlanRule24(facts: {
  readonly missingEventAnchorsLength: number;
}) {
  return facts.missingEventAnchorsLength > 0;
}
