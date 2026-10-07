import type { TraitEffectDeclaration } from "../../trait-packs";

/** A hot-headed officeholder is quick to challenge an opponent again. */
export const facetHotHeadedEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "seek",
        trait: "personality-v1:facet-hot-headed",
        pole: "high",
        explanation: "They are quick to challenge their opponents again.",
      },
    ],
  },
];
