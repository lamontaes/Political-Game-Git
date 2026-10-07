import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Self-confidence bears on accepting personal responsibility for another term.
 *
 * This is confidence in one's adequacy, not ambition, superiority, or a belief
 * that victory is certain. It therefore supplies one consideration beside the
 * officeholder's health, care obligations, record, and other traits; it never
 * overrides those causes or decides the outcome by itself.
 */
export const selfConfidenceEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "seek",
        trait: "personality-v1:self-confidence",
        pole: "high",
        explanation: "They trust their judgment enough to serve another term.",
      },
      {
        option: "step-down",
        trait: "personality-v1:self-confidence",
        pole: "low",
        explanation: "They doubt they are adequate for another term.",
      },
    ],
  },
];
