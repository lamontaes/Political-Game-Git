import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * A studious person is prepared to do the sustained work of testing a case at
 * trial instead of ending the inquiry with a plea. This is an argument, not a
 * rule: the evidence, sentence, principles, and every other recorded reason
 * remain in the same decision.
 */
export const facetStudiousEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "court.plea",
    leans: [
      {
        option: "trial",
        trait: "personality-v1:facet-studious",
        pole: "high",
        explanation:
          "They are willing to put sustained effort into understanding the case.",
      },
    ],
  },
];
