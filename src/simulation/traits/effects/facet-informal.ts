import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Informality is a relaxed manner with others.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetInformalEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "counter",
        trait: "personality-v1:facet-informal",
        pole: "high",
        explanation: "They answer a request casually and push back on terms.",
      },
    ],
  },
];
