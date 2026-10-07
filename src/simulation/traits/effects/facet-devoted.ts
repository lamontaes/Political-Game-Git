import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Devotion gives extra weight to keeping an established close commitment.
 * The catalog marks this facet one-sided, so an unrecorded tendency does not
 * argue for ending or leaving a relationship.
 */
export const facetDevotedEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "people.couple-stage",
    leans: [
      {
        option: "stay",
        trait: "personality-v1:facet-devoted",
        pole: "high",
        explanation:
          "They prioritize the close commitment they have already established.",
      },
    ],
  },
];
