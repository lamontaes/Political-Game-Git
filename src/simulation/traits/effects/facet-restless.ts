import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * A restless person cannot sit still in one position.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetRestlessEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "labor.worker-quit",
    leans: [
      {
        option: "quit",
        trait: "personality-v1:facet-restless",
        pole: "high",
        explanation:
          "They get restless in a job that holds them in place and look for the exit.",
      },
    ],
  },
];
