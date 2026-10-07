import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * A practical person goes with what is workable.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetPracticalEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-practical",
        pole: "high",
        explanation:
          "They take the plain, workable request at face value and agree to it.",
      },
    ],
  },
];
