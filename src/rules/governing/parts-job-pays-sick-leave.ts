// STOPGAP RULES3-GOV-022: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/epidemic.ts :: jobPaysSickLeave.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 1234: !role */
export function jobPaysSickLeaveRule1(facts: { readonly role: unknown }) {
  return !facts.role;
}

/** Legacy line 1236: (minimumHours + maximumHours) / 2 >= U.fullTimeWeeklyHours */
export function jobPaysSickLeaveRule2(facts: {
  readonly minimumHours: number;
  readonly maximumHours: number;
  readonly UFullTimeWeeklyHours: number;
}) {
  return (
    (facts.minimumHours + facts.maximumHours) / 2 >= facts.UFullTimeWeeklyHours
  );
}
