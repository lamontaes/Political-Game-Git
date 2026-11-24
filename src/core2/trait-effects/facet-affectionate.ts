import type { TraitEffectDeclaration } from "../trait-packs";

/**
 * An affectionate person has a reason to preserve or deepen an established
 * bond. Affection is not treated as attraction to a stranger: each receiving
 * decision still owns eligibility and relationship evidence, while this reader
 * contributes only the person's recorded trait.
 */
export const facetAffectionateEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "people.date-answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-affectionate",
        pole: "high",
      },
    ],
  },
  {
    decision: "people.couple-answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-affectionate",
        pole: "high",
      },
    ],
  },
  {
    decision: "people.couple-stage",
    leans: [
      {
        option: "stay",
        trait: "personality-v1:facet-affectionate",
        pole: "high",
      },
    ],
  },
];
