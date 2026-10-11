// STOPGAP RULES3-GOV-077: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/nationwide-world/state-executive-terms.ts :: planOrdinaryStateExecutiveTerm.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 210: contest     ? stateExecutiveIdentityForOfficeKey(contest.office.officeKey)     : null */
export function planOrdinaryStateExecutiveTermRule1(facts: {
  readonly contest: unknown;
  readonly stateExecutiveIdentityForOfficeKeyContestOfficeOfficeKey: unknown;
}) {
  return facts.contest
    ? facts.stateExecutiveIdentityForOfficeKeyContestOfficeOfficeKey
    : null;
}

/** Legacy line 213: !contest || !result || !identity */
export function planOrdinaryStateExecutiveTermRule2(facts: {
  readonly contest: unknown;
  readonly result: unknown;
  readonly identity: unknown;
}) {
  return !facts.contest || !facts.result || !facts.identity;
}

/** Legacy line 217: !isRegularStateExecutiveElection(world, identity, contest.electionDate) */
export function planOrdinaryStateExecutiveTermRule3(facts: {
  readonly isRegularStateExecutiveElectionWorldIdentityContestElectionDate: boolean;
}) {
  return !facts.isRegularStateExecutiveElectionWorldIdentityContestElectionDate;
}

/** Legacy line 224: dates.kind !== "dated" */
export function planOrdinaryStateExecutiveTermRule4(facts: {
  readonly datesKind: string;
}) {
  return facts.datesKind !== "dated";
}

/** Legacy line 236: routineQualificationBlocks(planned, winner, identity).length > 0 */
export function planOrdinaryStateExecutiveTermRule5(facts: {
  readonly routineQualificationBlocksPlannedWinnerIdentityLength: number;
}) {
  return facts.routineQualificationBlocksPlannedWinnerIdentityLength > 0;
}
