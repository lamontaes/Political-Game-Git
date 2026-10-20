import type { TraitEffectDeclaration } from "../../../core2/trait-packs";

/** An arbitrary person may make an unpredictable career choice. */
export const facetArbitraryEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "step-down",
        trait: "personality-v1:facet-arbitrary",
        pole: "high",
        explanation: "They may make an unpredictable career choice.",
      },
    ],
  },
];
