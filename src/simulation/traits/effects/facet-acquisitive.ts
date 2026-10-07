import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Acquisitiveness is a drive to gain wealth and possessions.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetAcquisitiveEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "seek",
        trait: "personality-v1:facet-acquisitive",
        pole: "high",
        explanation: "They want what the seat brings and run for another term.",
      },
    ],
  },
];
