// STOPGAP RULES3-GOV-070: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/nationwide-world/executive-term-rules-in-world.ts :: governingTermYearChanges.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 81: change.stateUsps === stateUsps &&       change.officeKey === officeKey &&       change.field === "executive.term.years" */
export function governingTermYearChangesRule1(facts: {
  readonly changeStateUsps: string;
  readonly stateUsps: string;
  readonly changeOfficeKey: string;
  readonly officeKey: string;
  readonly changeField: string;
}) {
  return (
    facts.changeStateUsps === facts.stateUsps &&
    facts.changeOfficeKey === facts.officeKey &&
    facts.changeField === "executive.term.years"
  );
}

/** Legacy line 91: row.operativeAt <= change.operativeAt */
export function governingTermYearChangesRule2(facts: {
  readonly rowOperativeAt: string;
  readonly changeOperativeAt: string;
}) {
  return facts.rowOperativeAt <= facts.changeOperativeAt;
}

/** Legacy line 93: winner && governing.at(-1) !== winner */
export function governingTermYearChangesRule3(facts: {
  readonly winner: unknown;
  readonly governingAt1: unknown;
}) {
  return facts.winner && facts.governingAt1 !== facts.winner;
}

/** Legacy line 93: -1 */
export function governingTermYearChangesRule4() {
  return -1;
}
