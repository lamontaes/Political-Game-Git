// STOPGAP RULES3-GOV-047: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/officeholder-principles.ts :: principleView.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 207: score === 0 */
export function principleViewRule1(facts: { readonly score: number }) {
  return facts.score === 0;
}

/** Legacy line 208: Math.abs(score) */
export function principleViewRule2(facts: { readonly score: number }) {
  return Math.abs(facts.score);
}

/** Legacy line 210: score > 0 ? "yes" : "no" */
export function principleViewRule3(facts: { readonly score: number }) {
  return facts.score > 0 ? "yes" : "no";
}

/** Legacy line 212: size >= VOTE_IMPORTANCE.decisive         ? "central"         : size >= VOTE_IMPORTANCE.strong           ? "high"           : size >= VOTE_IMPORTANCE.moderate             ? "moderate"             : "low" */
export function principleViewRule4(facts: {
  readonly size: number;
  readonly VOTE_IMPORTANCEDecisive: number;
  readonly VOTE_IMPORTANCEStrong: number;
  readonly VOTE_IMPORTANCEModerate: number;
}) {
  return facts.size >= facts.VOTE_IMPORTANCEDecisive
    ? "central"
    : facts.size >= facts.VOTE_IMPORTANCEStrong
      ? "high"
      : facts.size >= facts.VOTE_IMPORTANCEModerate
        ? "moderate"
        : "low";
}
