import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * An analytical person works through the details before answering.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetAnalyticalEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "counter",
        trait: "personality-v1:facet-analytical",
        pole: "high",
      },
    ],
  },
];
