// STOPGAP RULES3-GOV-018: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/epidemic.ts :: susceptibility.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 793: epidemicSusceptibilityAtAge(exactAge(world, personId)) *     (alreadyIll.has(personId) ? U.alreadyIllFactor : 1) *     U.carefulnessFactor[riskApproachOf(world, personId)] */
export function susceptibilityRule1(facts: {
  readonly epidemicSusceptibilityAtAgeExactAgeWorldPersonId: number;
  readonly alreadyIllHasPersonId: boolean;
  readonly UAlreadyIllFactor: number;
  readonly UCarefulnessFactorRiskApproachOfWorldPersonId: number;
}) {
  return (
    facts.epidemicSusceptibilityAtAgeExactAgeWorldPersonId *
    (facts.alreadyIllHasPersonId ? facts.UAlreadyIllFactor : 1) *
    facts.UCarefulnessFactorRiskApproachOfWorldPersonId
  );
}
