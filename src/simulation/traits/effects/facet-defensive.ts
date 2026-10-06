import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * A defensive person responds to perceived criticism by protecting their
 * self-image. A plea is an admission of guilt in open court, so facing a charge
 * that is a reason to contest it at trial instead. It is an argument, not a
 * rule: the evidence, the sentence on offer, principles and every other
 * recorded reason stay in the same decision.
 */
export const facetDefensiveEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "court.plea",
    leans: [
      {
        option: "trial",
        trait: "personality-v1:facet-defensive",
        pole: "high",
        explanation: "They do not want to stand in court and admit the charge.",
      },
    ],
  },
];
