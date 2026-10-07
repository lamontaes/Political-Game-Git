import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Charming people use responsive delivery to engage an audience. During a
 * live press request, that tendency supports answering the account directly.
 */
export const facetCharmingEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "press.subject-response",
    leans: [
      {
        option: "dispute",
        trait: "personality-v1:facet-charming",
        pole: "high",
        explanation:
          "They use engaging delivery to answer the account directly.",
      },
    ],
  },
];
