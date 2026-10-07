import type { TraitEffectDeclaration } from "../../trait-packs";

export const facetComfortingEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-comforting",
        pole: "high",
        explanation: "They would rather stay present than leave someone alone.",
      },
    ],
  },
];
