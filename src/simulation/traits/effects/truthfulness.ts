import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Truthfulness bears on whether someone puts an account on the record when
 * they cannot substantiate a denial. The underlying request still owns the
 * facts and every other reason for speaking or staying silent.
 */
export const truthfulnessEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "press.subject-response",
    leans: [
      {
        option: "decline",
        trait: "personality-v1:truthfulness",
        pole: "high",
        explanation:
          "They avoid contradicting an account when they cannot support a truthful correction.",
      },
      {
        option: "dispute",
        trait: "personality-v1:truthfulness",
        pole: "low",
        explanation:
          "They are more willing to challenge an account without a well-supported basis.",
      },
    ],
  },
];
