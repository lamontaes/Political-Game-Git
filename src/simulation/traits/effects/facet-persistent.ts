import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Persistence is keeping on toward an objective through setbacks. Absence of the marked pattern contributes nothing and does not establish the opposite.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetPersistentEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "labor.worker-quit",
    leans: [
      {
        option: "continue-work",
        trait: "personality-v1:facet-persistent",
        pole: "high",
      },
    ],
  },
];
