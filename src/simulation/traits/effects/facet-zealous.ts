import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Zeal is intensity in service of an already held conviction. It does not
 * supply the conviction, decide whether it is sound, or make a person seek
 * office by itself. When an officeholder is already weighing another term,
 * however, that sustained commitment is a reason to keep doing the work.
 */
export const facetZealousEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "seek",
        trait: "personality-v1:facet-zealous",
        pole: "high",
        explanation:
          "They pursue their public commitments with unusual intensity.",
      },
    ],
  },
];
