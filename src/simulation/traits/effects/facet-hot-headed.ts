import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Hot-headedness is escalating quickly when a frustration is perceived. A
 * worker weighing whether to stay in a frustrating job leans toward quitting.
 * The catalog marks the trait one-sided, so only its high pole argues; no
 * marked hot-headedness says nothing about staying power.
 */
export const facetHotHeadedEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "labor.worker-quit",
    leans: [
      {
        option: "quit",
        trait: "personality-v1:facet-hot-headed",
        pole: "high",
        explanation:
          "A frustration at work sets them off fast, and walking out is the quickest answer.",
      },
    ],
  },
];
