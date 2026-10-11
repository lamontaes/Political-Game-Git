// STOPGAP RULES3-GOV-017: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/epidemic.ts :: epidemicCaseSeverity.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 708: seriousness >= 0.5 ? "serious" : "acute" */
export function epidemicCaseSeverityRule1(facts: {
  readonly seriousness: number;
}) {
  return facts.seriousness >= 0.5 ? "serious" : "acute";
}

/** Legacy line 712: Math.round(     between(       acuteRecovering!.afterDays,       seriousRecovering!.afterDays,       seriousness,     ),   ) */
export function epidemicCaseSeverityRule2(facts: {
  readonly betweenResult: number;
}) {
  return Math.round(facts.betweenResult);
}

/** Legacy line 719: Math.max(     recoveringAfter + 1,     Math.round(       between(acuteWell!.afterDays, seriousWell!.afterDays, seriousness),     ),   ) */
export function epidemicCaseSeverityRule3(facts: {
  readonly recoveringAfter: number;
  readonly betweenAcuteWellAfterDaysSeriousWellAfterDaysSeriousness: number;
}) {
  return Math.max(
    facts.recoveringAfter + 1,
    Math.round(facts.betweenAcuteWellAfterDaysSeriousWellAfterDaysSeriousness),
  );
}

/** Legacy line 727: Math.round(seriousness * recoveringAfter) */
export function epidemicCaseSeverityRule4(facts: {
  readonly seriousness: number;
  readonly recoveringAfter: number;
}) {
  return Math.round(facts.seriousness * facts.recoveringAfter);
}

/** Legacy line 729: incapacitatedDays > 0 && incapacitatedDays < recoveringAfter       ? [           {             afterDays: incapacitatedDays,             state: severity,             functionalLimitation: "limited" as const,           },         ]       : [] */
export function epidemicCaseSeverityRule5(facts: {
  readonly incapacitatedDays: number;
  readonly recoveringAfter: number;
  readonly afterDaysIncapacitatedDaysStateSeverityFunctionalLimitationL: unknown[];
}) {
  return facts.incapacitatedDays > 0 &&
    facts.incapacitatedDays < facts.recoveringAfter
    ? facts.afterDaysIncapacitatedDaysStateSeverityFunctionalLimitationL
    : [];
}

/** Legacy line 741: Math.round(       between(U.hazardMicros.acute, U.hazardMicros.serious, seriousness),     ) */
export function epidemicCaseSeverityRule6(facts: {
  readonly betweenUHazardMicrosAcuteUHazardMicrosSeriousSeriousness: number;
}) {
  return Math.round(
    facts.betweenUHazardMicrosAcuteUHazardMicrosSeriousSeriousness,
  );
}

/** Legacy line 745: incapacitatedDays > 0 ? "incapacitated" : "limited" */
export function epidemicCaseSeverityRule7(facts: {
  readonly incapacitatedDays: number;
}) {
  return facts.incapacitatedDays > 0 ? "incapacitated" : "limited";
}
