import type { TraitEffectDeclaration } from "../../trait-packs";

/** Nostalgia gives continuity in a meaningful established relationship weight. */
export const facetNostalgicEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "people.couple-stage",
    leans: [
      {
        option: "stay",
        trait: "personality-v1:facet-nostalgic",
        pole: "high",
        explanation:
          "Frequently revisits meaningful earlier relationships and experiences.",
      },
    ],
  },
];
