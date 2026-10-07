import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Observation is noticing detail.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetObservantEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "counter",
        trait: "personality-v1:facet-observant",
        pole: "high",
      },
    ],
  },
];
