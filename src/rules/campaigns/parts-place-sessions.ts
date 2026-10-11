// STOPGAP RULES3-CAM-034: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-weekly-plans.ts :: placeSessions.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 918: date <= context.weekEnd */
export function placeSessionsRule1(facts: {
  readonly date: string;
  readonly contextWeekEnd: string;
}) {
  return facts.date <= facts.contextWeekEnd;
}

/** Legacy line 928: compareSimulationMoments(start, world.currentMoment) > 0 */
export function placeSessionsRule2(facts: {
  readonly compareSimulationMomentsStartWorldCurrentMoment: number;
}) {
  return facts.compareSimulationMomentsStartWorldCurrentMoment > 0;
}

/** Legacy line 939: cursor < slots.length && !placed */
export function placeSessionsRule3(facts: {
  readonly cursor: number;
  readonly slotsLength: number;
  readonly placed: boolean;
}) {
  return facts.cursor < facts.slotsLength && !facts.placed;
}

/** Legacy line 941: cursor += 1 */
export function placeSessionsRule4(facts: { readonly cursor: number }) {
  return facts.cursor + 1;
}

/** Legacy line 967: error instanceof Error &&           error.message.startsWith("Scheduled activity conflicts with") */
export function placeSessionsRule5(facts: {
  readonly errorInstanceofError: boolean;
  readonly errorMessageStartsWithScheduledActivityConflictsWith: boolean;
}) {
  return (
    facts.errorInstanceofError &&
    facts.errorMessageStartsWithScheduledActivityConflictsWith
  );
}

/** Legacy line 975: !placed */
export function placeSessionsRule6(facts: { readonly placed: boolean }) {
  return !facts.placed;
}
