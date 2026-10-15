import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Brooding can keep an earlier unpleasant exchange present when a person
 * considers a new invitation. That gives them a reason to decline; the other
 * circumstances of the invitation still take part in the decision.
 */
export const facetBroodingEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "decline",
        trait: "personality-v1:facet-brooding",
        pole: "high",
        explanation:
          "Unpleasant experiences stay on their mind while they weigh the invitation.",
      },
    ],
  },
];
