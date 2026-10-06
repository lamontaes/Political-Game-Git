import type { DecisionDeclaration, TraitPack } from "../../trait-packs";

/**
 * The romance decisions where an affectionate person has a reason to preserve
 * or deepen an established bond. Affection is not treated as attraction to a
 * stranger: each receiving decision still owns eligibility and relationship
 * evidence, while this reader contributes only the person's recorded trait.
 */
export const FACET_AFFECTIONATE_DECISIONS: readonly DecisionDeclaration[] = [
  {
    id: "people.date-answer",
    scope: "relationship:choice",
    options: ["accept", "decline"],
  },
  {
    id: "people.couple-answer",
    scope: "relationship:choice",
    options: ["accept", "decline"],
  },
  {
    id: "people.couple-stage",
    scope: "relationship:choice",
    options: ["stay", "break-up", "separate"],
  },
];

/**
 * An effect-only pack: the personality catalog owns the trait declaration,
 * and this reader owns every decision the trait argues in.
 */
export const FACET_AFFECTIONATE_EFFECTS: TraitPack = {
  pack: "personality-effects-facet-affectionate",
  traits: [],
  effects: [
    {
      decision: "people.date-answer",
      leans: [
        {
          option: "accept",
          trait: "personality-v1:facet-affectionate",
          pole: "high",
          explanation:
            "They readily express warmth when this relationship draws closer.",
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
          explanation:
            "They want to express the warmth already growing between them.",
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
          explanation:
            "They keep expressing warmth toward the person they love.",
        },
      ],
    },
  ],
};
