// STOPGAP RULES3-GOV-034: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/international.ts :: internationalCrisisState.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 185: options.at(-1)?.cycle ?? 0 */
export function internationalCrisisStateRule1(facts: {
  readonly optionsAt1Cycle: number | undefined;
}) {
  return facts.optionsAt1Cycle! ?? 0;
}

/** Legacy line 185: -1 */
export function internationalCrisisStateRule2() {
  return -1;
}

/** Legacy line 187: warPowers.some((r) => r.stage === "forces-introduced") &&     !warPowers.some((r) => r.stage === "forces-withdrawn") */
export function internationalCrisisStateRule3(facts: {
  readonly warPowersSomeRRStageForcesIntroduced: boolean;
  readonly warPowersSomeRRStageForcesWithdrawn: boolean;
}) {
  return (
    facts.warPowersSomeRRStageForcesIntroduced &&
    !facts.warPowersSomeRRStageForcesWithdrawn
  );
}

/** Legacy line 187: r.stage === "forces-introduced" */
export function internationalCrisisStateRule4(facts: {
  readonly rStage: string;
}) {
  return facts.rStage === "forces-introduced";
}

/** Legacy line 188: r.stage === "forces-withdrawn" */
export function internationalCrisisStateRule5(facts: {
  readonly rStage: string;
}) {
  return facts.rStage === "forces-withdrawn";
}

/** Legacy line 191: responses.at(-1)?.tensionAfter ?? crisis.tension */
export function internationalCrisisStateRule6(facts: {
  readonly responsesAt1TensionAfter: string | undefined;
  readonly crisisTension: string;
}) {
  return facts.responsesAt1TensionAfter! ?? facts.crisisTension;
}

/** Legacy line 191: -1 */
export function internationalCrisisStateRule7() {
  return -1;
}

/** Legacy line 204: options.length > 0 && !decisions.some((d) => d.cycle === cycle) */
export function internationalCrisisStateRule8(facts: {
  readonly optionsLength: number;
  readonly decisionsSomeDDCycleCycle: boolean;
}) {
  return facts.optionsLength > 0 && !facts.decisionsSomeDDCycleCycle;
}

/** Legacy line 204: d.cycle === cycle */
export function internationalCrisisStateRule9(facts: {
  readonly dCycle: number;
  readonly cycle: number;
}) {
  return facts.dCycle === facts.cycle;
}
