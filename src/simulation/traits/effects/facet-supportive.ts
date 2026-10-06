import type { TraitEffectDeclaration } from "../../trait-packs";

export const facetSupportiveEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-supportive",
        pole: "high",
        explanation: "They want to help the other person keep going.",
      },
    ],
  },
];
