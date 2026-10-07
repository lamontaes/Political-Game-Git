import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Curiosity is actively exploring unanswered questions. Absence of the marked pattern contributes nothing and does not establish the opposite.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetCuriousEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-curious",
        pole: "high",
      },
    ],
  },
];
