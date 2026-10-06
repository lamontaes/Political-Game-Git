import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * An argumentative person often treats discussion as a contest over who is
 * correct. Facing a charge, that is a reason to contest it at trial instead of
 * accepting the plea on offer. It is an argument, not a rule: the evidence,
 * the sentence on offer, principles and every other recorded reason stay in the
 * same decision.
 */
export const facetArgumentativeEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "court.plea",
    leans: [
      {
        option: "trial",
        trait: "personality-v1:facet-argumentative",
        pole: "high",
        explanation:
          "They would rather contest the charge than concede the point.",
      },
    ],
  },
];
