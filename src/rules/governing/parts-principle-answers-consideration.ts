// STOPGAP RULES3-GOV-046: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/officeholder-principles.ts :: principleAnswersConsideration.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 162: score += row.answer === "yes" ? leaning.score : -leaning.score */
export function principleAnswersConsiderationRule1(facts: {
  readonly score: number;
  readonly rowAnswer: string;
  readonly leaningScore: number;
}) {
  return (
    facts.score +
    (facts.rowAnswer === "yes" ? facts.leaningScore : -facts.leaningScore)
  );
}

/** Legacy line 165: score === 0 */
export function principleAnswersConsiderationRule2(facts: {
  readonly score: number;
}) {
  return facts.score === 0;
}

/** Legacy line 166: Math.abs(score) */
export function principleAnswersConsiderationRule3(facts: {
  readonly score: number;
}) {
  return Math.abs(facts.score);
}

/** Legacy line 168: score > 0 ? "member:principle:for" : "member:principle:against" */
export function principleAnswersConsiderationRule4(facts: {
  readonly score: number;
}) {
  return facts.score > 0 ? "member:principle:for" : "member:principle:against";
}

/** Legacy line 169: score > 0 ? "vote-yea" : "vote-nay" */
export function principleAnswersConsiderationRule5(facts: {
  readonly score: number;
}) {
  return facts.score > 0 ? "vote-yea" : "vote-nay";
}

/** Legacy line 173: size >= VOTE_IMPORTANCE.decisive         ? "decisive"         : size >= VOTE_IMPORTANCE.strong           ? "strong"           : size >= VOTE_IMPORTANCE.moderate             ? "moderate"             : "slight" */
export function principleAnswersConsiderationRule6(facts: {
  readonly size: number;
  readonly VOTE_IMPORTANCEDecisive: number;
  readonly VOTE_IMPORTANCEStrong: number;
  readonly VOTE_IMPORTANCEModerate: number;
}) {
  return facts.size >= facts.VOTE_IMPORTANCEDecisive
    ? "decisive"
    : facts.size >= facts.VOTE_IMPORTANCEStrong
      ? "strong"
      : facts.size >= facts.VOTE_IMPORTANCEModerate
        ? "moderate"
        : "slight";
}

/** Legacy line 182: score > 0         ? "The bill does what the member's principles call for."         : "The bill cuts against the member's principles." */
export function principleAnswersConsiderationRule7(facts: {
  readonly score: number;
}) {
  return facts.score > 0
    ? "The bill does what the member's principles call for."
    : "The bill cuts against the member's principles.";
}
