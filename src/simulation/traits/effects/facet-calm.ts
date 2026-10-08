import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * A calm person keeps steady under workplace strain.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetCalmEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "labor.worker-quit",
    leans: [
      {
        option: "continue-work",
        trait: "personality-v1:facet-calm",
        pole: "high",
      },
    ],
  },
];
