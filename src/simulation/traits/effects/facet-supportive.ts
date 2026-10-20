import type { TraitEffectDeclaration } from "../../../core2/trait-packs";

export const facetSupportiveEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-supportive",
        pole: "high",
      },
    ],
  },
];
