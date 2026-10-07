import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Sincerity is meaning what one says. Absence of the marked pattern contributes nothing and does not establish the opposite.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetSincereEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-sincere",
        pole: "high",
        explanation: "They mean it when they agree, so they say yes plainly.",
      },
    ],
  },
];
