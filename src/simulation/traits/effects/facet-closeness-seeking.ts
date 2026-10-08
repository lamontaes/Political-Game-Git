import type { TraitEffectDeclaration } from "../../trait-packs";

/** A high need for closeness gives a committed bond's invitation extra weight. */
export const facetClosenessSeekingEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "people.couple-answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-closeness-seeking",
        pole: "high",
        explanation:
          "They value the reassurance and shared time of a close bond.",
      },
    ],
  },
];
