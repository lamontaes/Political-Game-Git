import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * A hot-headed person acts on a flash of anger at work.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetHotHeadedEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "labor.worker-quit",
    leans: [
      {
        option: "quit",
        trait: "personality-v1:facet-hot-headed",
        pole: "high",
        explanation: "A flare of temper pushes them toward walking out.",
      },
    ],
  },
];
