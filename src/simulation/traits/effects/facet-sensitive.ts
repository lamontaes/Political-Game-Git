import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * A personally meaningful question can draw a sensitive person into a strong
 * response. The press decision still owns knowledge and eligibility; this
 * reader contributes only the person's recorded tendency.
 */
export const facetSensitiveEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "press.subject-response",
    leans: [
      {
        option: "dispute",
        trait: "personality-v1:facet-sensitive",
        pole: "high",
        explanation:
          "The personally meaningful question draws them to answer the account directly.",
      },
    ],
  },
];
