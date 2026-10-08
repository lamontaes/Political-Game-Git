import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Enterprise is taking initiative to start and build. Absence of the marked pattern contributes nothing and does not establish the opposite.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetEnterprisingEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "seek",
        trait: "personality-v1:facet-enterprising",
        pole: "high",
      },
    ],
  },
];
