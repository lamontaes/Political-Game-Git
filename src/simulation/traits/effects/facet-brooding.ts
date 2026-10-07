import type { TraitEffectDeclaration } from "../../trait-packs";

/** Brooding can make an officeholder dwell on the cost of another term. */
export const facetBroodingEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "step-down",
        trait: "personality-v1:facet-brooding",
        pole: "high",
        explanation:
          "They keep dwelling on the strain of another term in office.",
      },
    ],
  },
];
