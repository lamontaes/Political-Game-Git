import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * An open-minded person gives unfamiliar explanations a hearing. On a jury that
 * means the account the defense offers is weighed instead of set aside, which
 * is a reason to vote not guilty. It is an argument, not a rule: the evidence
 * in the case, the burden of proof, the room and every other recorded reason
 * stay in the same ballot.
 */
export const facetOpenMindedEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "court.jury-vote",
    leans: [
      {
        option: "acquit",
        trait: "personality-v1:facet-open-minded",
        pole: "high",
        explanation: "They are willing to hear out the defense's account.",
      },
    ],
  },
];
