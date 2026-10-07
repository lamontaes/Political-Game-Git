import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Imagination is thinking of things not yet real.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetImaginativeEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "counter",
        trait: "personality-v1:facet-imaginative",
        pole: "high",
      },
    ],
  },
];
