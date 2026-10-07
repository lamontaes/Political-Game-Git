import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Devoted people frequently prioritize an established close commitment. When
 * asked to form a couple, that tendency supports accepting the relationship.
 */
export const facetDevotedEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "people.couple-answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-devoted",
        pole: "high",
        explanation:
          "They give priority to forming a lasting close commitment.",
      },
    ],
  },
];
