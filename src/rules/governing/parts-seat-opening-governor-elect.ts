// STOPGAP RULES3-GOV-078: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/nationwide-world/state-executives.ts :: seatOpeningGovernorElect.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 405: !termEnds || !rule || termEnds <= world.currentDate */
export function seatOpeningGovernorElectRule1(facts: {
  readonly termEnds: string | null;
  readonly rule: unknown;
  readonly currentDate: string;
}) {
  return !facts.termEnds! || !facts.rule || facts.termEnds <= facts.currentDate;
}

/** Legacy line 407: Number(termEnds.slice(0, 4)) */
export function seatOpeningGovernorElectRule2(facts: {
  readonly termEndsSlice04: string;
}) {
  return Number(facts.termEndsSlice04);
}

/** Legacy line 409: !isElectionYear(rule.election, electionYear) ||     generalElectionDay(rule.election, electionYear) >= termEnds */
export function seatOpeningGovernorElectRule3(facts: {
  readonly isElectionYearRuleElectionElectionYear: boolean;
  readonly generalElectionDayRuleElectionElectionYear: string;
  readonly termEnds: string;
}) {
  return (
    !facts.isElectionYearRuleElectionElectionYear ||
    facts.generalElectionDayRuleElectionElectionYear >= facts.termEnds
  );
}

/** Legacy line 412: electionYear -= 1 */
export function seatOpeningGovernorElectRule4(facts: {
  readonly electionYear: number;
}) {
  return facts.electionYear - 1;
}

/** Legacy line 413: electionYear < Number(termEnds.slice(0, 4)) - rule.election.cycleYears */
export function seatOpeningGovernorElectRule5(facts: {
  readonly electionYear: number;
  readonly termEndsSlice04: string;
  readonly ruleElectionCycleYears: number;
}) {
  return (
    facts.electionYear <
    Number(facts.termEndsSlice04) - facts.ruleElectionCycleYears
  );
}

/** Legacy line 417: electionDay >= world.currentDate */
export function seatOpeningGovernorElectRule6(facts: {
  readonly electionDay: string;
  readonly currentDate: string;
}) {
  return facts.electionDay >= facts.currentDate;
}

/** Legacy line 419: window.startsAt !== termEnds */
export function seatOpeningGovernorElectRule7(facts: {
  readonly windowStartsAt: string | null;
  readonly termEnds: string;
}) {
  return facts.windowStartsAt! !== facts.termEnds;
}

/** Legacy line 421: event.stableKey === tenureKey */
export function seatOpeningGovernorElectRule8(facts: {
  readonly eventStableKey: string;
  readonly tenureKey: string;
}) {
  return facts.eventStableKey === facts.tenureKey;
}

/** Legacy line 470: window.endExclusive === null         ? []         : [`term-end:${window.endExclusive}`] */
export function seatOpeningGovernorElectRule9(facts: {
  readonly windowEndExclusive: string | null;
  readonly termEnd$WindowEndExclusive: string[];
}) {
  return facts.windowEndExclusive! === null
    ? []
    : facts.termEnd$WindowEndExclusive;
}
