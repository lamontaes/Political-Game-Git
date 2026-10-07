import type { TraitEffectDeclaration } from "../../trait-packs";

/** Revisiting a meaningful past connection can make a new invitation welcome. */
export const facetNostalgicEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-nostalgic",
        pole: "high",
        explanation:
          "They welcome the chance to reconnect with someone from their past.",
      },
    ],
  },
];
