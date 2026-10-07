import type { TraitEffectDeclaration } from "../../trait-packs";

/** Self-serving priorities give personal benefit unusual weight. */
export const facetSelfServingEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "seek",
        trait: "personality-v1:facet-self-serving",
        pole: "high",
        explanation: "They see another term as a chance to advance themselves.",
      },
    ],
  },
];
