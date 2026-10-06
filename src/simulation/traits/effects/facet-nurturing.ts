import type { TraitEffectDeclaration } from "../../trait-packs";

export const facetNurturingEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-nurturing",
        pole: "high",
        explanation: "They make time for another person's care and growth.",
      },
    ],
  },
];
