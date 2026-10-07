import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * An inventive person comes up with alternatives.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetInventiveEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "counter",
        trait: "personality-v1:facet-inventive",
        pole: "high",
        explanation:
          "They think of a different way to meet the request and offer that instead.",
      },
    ],
  },
];
