// STOPGAP RULES3-CAM-041: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/living-world/movement-succession.ts :: temperamentConsiderations.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 194: trait.trait === "deliberation" */
export function temperamentConsiderationsRule1(facts: {
  readonly traitTrait: string;
}) {
  return facts.traitTrait === "deliberation";
}

/** Legacy line 195: trait.trait === "risk" */
export function temperamentConsiderationsRule2(facts: {
  readonly traitTrait: string;
}) {
  return facts.traitTrait === "risk";
}

/** Legacy line 201: -1 */
export function temperamentConsiderationsRule3() {
  return -1;
}

/** Legacy line 203: candidateLeaderInteraction?.id ?? "unavailable-record" */
export function temperamentConsiderationsRule4(facts: {
  readonly candidateLeaderInteractionId: string | undefined;
}) {
  return facts.candidateLeaderInteractionId! ?? "unavailable-record";
}

/** Legacy line 205: Math.abs(risk.value) === 2       ? "strong"       : Math.abs(risk.value) === 1         ? "moderate"         : "slight" */
export function temperamentConsiderationsRule5(facts: {
  readonly riskValue: number;
}) {
  return Math.abs(facts.riskValue) === 2
    ? "strong"
    : Math.abs(facts.riskValue) === 1
      ? "moderate"
      : "slight";
}

/** Legacy line 211: Math.abs(deliberation.value) === 2       ? "strong"       : Math.abs(deliberation.value) === 1         ? "moderate"         : "slight" */
export function temperamentConsiderationsRule6(facts: {
  readonly deliberationValue: number;
}) {
  return Math.abs(facts.deliberationValue) === 2
    ? "strong"
    : Math.abs(facts.deliberationValue) === 1
      ? "moderate"
      : "slight";
}

/** Legacy line 217: recordId !== null */
export function temperamentConsiderationsRule7(facts: {
  readonly recordId: string | null;
}) {
  return facts.recordId! !== null;
}

/** Legacy line 222: risk.value <= 0 */
export function temperamentConsiderationsRule8(facts: {
  readonly riskValue: number;
}) {
  return facts.riskValue <= 0;
}

/** Legacy line 225: candidateLeaderInteraction?.id ?? "no-recorded-tie" */
export function temperamentConsiderationsRule9(facts: {
  readonly candidateLeaderInteractionId: string | undefined;
}) {
  return facts.candidateLeaderInteractionId! ?? "no-recorded-tie";
}

/** Legacy line 229: candidateToLeader.length > 0           ? continuityLeansPositive             ? "supports"             : "opposes"           : continuityLeansPositive             ? "opposes"             : "supports" */
export function temperamentConsiderationsRule10(facts: {
  readonly candidateToLeaderLength: number;
  readonly continuityLeansPositive: boolean;
}) {
  return facts.candidateToLeaderLength > 0
    ? facts.continuityLeansPositive
      ? "supports"
      : "opposes"
    : facts.continuityLeansPositive
      ? "opposes"
      : "supports";
}

/** Legacy line 239: candidateToLeader.length > 0           ? `The member's risk temperament weighs this candidate's recorded tie (${candidateLeaderInteractionId}) to the outgoing leader.`           : "The member's risk temperament weighs the absence of a recorded tie to */
export function temperamentConsiderationsRule11(facts: {
  readonly candidateToLeaderLength: number;
  readonly candidateLeaderInteractionId: string;
}) {
  return facts.candidateToLeaderLength > 0
    ? `The member's risk temperament weighs this candidate's recorded tie (${facts.candidateLeaderInteractionId}) to the outgoing leader.`
    : "The member's risk temperament weighs the absence of a recorded tie to the outgoing leader.";
}
