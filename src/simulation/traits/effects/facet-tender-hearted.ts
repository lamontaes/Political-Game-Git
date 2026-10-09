import type { TraitEffectDeclaration } from "../../trait-packs";

export const facetTenderHeartedEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "counter",
        trait: "personality-v1:facet-tender-hearted",
        pole: "high",
      },
    ],
  },
];
