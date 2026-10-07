import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Deference is yielding to others' wishes and standing.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetDeferentialEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-deferential",
        pole: "high",
        explanation: "They defer to the person asking and agree.",
      },
    ],
  },
];
