// STOPGAP RULES3-CAM-026: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-stands.ts :: liveQuestionsIn.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 43: !position.terminal && position.phase !== "drafting" */
export function liveQuestionsInRule1(facts: {
  readonly positionTerminal: boolean;
  readonly positionPhase: string;
}) {
  return !facts.positionTerminal && facts.positionPhase !== "drafting";
}

/** Legacy line 46: b.sequence - a.sequence */
export function liveQuestionsInRule2(facts: {
  readonly bSequence: number;
  readonly aSequence: number;
}) {
  return facts.bSequence - facts.aSequence;
}

/** Legacy line 48: measure.propositionIds ?? [] */
export function liveQuestionsInRule3(facts: {
  readonly measurePropositionIds: unknown;
}) {
  return facts.measurePropositionIds ?? [];
}

/** Legacy line 51: !answer || !definition */
export function liveQuestionsInRule4(facts: {
  readonly answer: string | null;
  readonly definition: unknown;
}) {
  return !facts.answer! || !facts.definition;
}
