import type { TraitEffectDeclaration } from "../../trait-packs";

export const facetGentleEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "counter",
        trait: "personality-v1:facet-gentle",
        pole: "high",
        explanation: "They look for a gentler way to answer.",
      },
    ],
  },
];
