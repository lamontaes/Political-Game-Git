// STOPGAP RULES3-GOV-084: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/record-in-office.ts :: unemploymentOn.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 55: start && start.effectiveDate <= date     ? start.initial.unemploymentPct     : null */
export function unemploymentOnRule1(facts: {
  readonly start: unknown;
  readonly startEffectiveDate: string;
  readonly date: string;
  readonly startInitialUnemploymentPct: number;
}) {
  return facts.start && facts.startEffectiveDate <= facts.date
    ? facts.startInitialUnemploymentPct
    : null;
}
