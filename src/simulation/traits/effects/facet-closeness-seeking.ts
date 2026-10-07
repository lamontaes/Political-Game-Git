import type { TraitEffectDeclaration } from "../../trait-packs";

/** A recorded preference for reassurance and shared time in close bonds. */
export const facetClosenessSeekingEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-closeness-seeking",
        pole: "high",
        explanation: "They value reassurance and shared time in close bonds.",
      },
    ],
  },
];
