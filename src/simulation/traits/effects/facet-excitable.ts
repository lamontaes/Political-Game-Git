import type { TraitEffectDeclaration } from "../../trait-packs";

/** Enthusiasm for an available opportunity can carry into another term. */
export const facetExcitableEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "seek",
        trait: "personality-v1:facet-excitable",
        pole: "high",
        explanation: "They show enthusiasm for this opportunity.",
      },
    ],
  },
];
