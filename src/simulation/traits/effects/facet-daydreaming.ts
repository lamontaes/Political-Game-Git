import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Daydreaming is drifting into imagined scenes.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetDaydreamingEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "labor.worker-quit",
    leans: [
      {
        option: "quit",
        trait: "personality-v1:facet-daydreaming",
        pole: "high",
      },
    ],
  },
];
