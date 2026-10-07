import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * A cocky person overestimates their own prospects and advertises that
 * confidence. Facing a charge, that reads as more reason to test the case at
 * trial than to accept the plea on offer. It is an argument, not a rule: the
 * evidence, the sentence on offer, principles and every other recorded reason
 * stay in the same decision.
 */
export const facetCockyEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "court.plea",
    leans: [
      {
        option: "trial",
        trait: "personality-v1:facet-cocky",
        pole: "high",
        explanation: "They expect to do better at trial than the odds suggest.",
      },
    ],
  },
];
