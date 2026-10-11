// STOPGAP RULES3-GOV-038: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/executive-work.ts :: spendExecutiveWorkTime.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 758: !office */
export function spendExecutiveWorkTimeRule1(facts: {
  readonly office: unknown;
}) {
  return !facts.office;
}

/** Legacy line 760: office.endsAt &&     addSimulationMinutes(world.currentMoment, 30).date >= office.endsAt */
export function spendExecutiveWorkTimeRule2(facts: {
  readonly officeEndsAt: string;
  readonly addSimulationMinutesWorldCurrentMoment30Date: string;
}) {
  return (
    facts.officeEndsAt &&
    facts.addSimulationMinutesWorldCurrentMoment30Date >= facts.officeEndsAt
  );
}

/** Legacy line 779: error instanceof Error ? error.message : "Work time could not advance." */
export function spendExecutiveWorkTimeRule4(facts: {
  readonly errorInstanceofError: boolean;
  readonly errorMessage: string;
}) {
  return facts.errorInstanceofError
    ? facts.errorMessage
    : "Work time could not advance.";
}
