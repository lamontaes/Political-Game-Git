import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * A skeptical person asks what supports a claim before relying on it. On a
 * jury that is a reason to hold the prosecution to its proof and vote not
 * guilty. It is an argument, not a rule: the evidence in the case, the burden
 * of proof, the room and every other recorded reason stay in the same ballot.
 */
export const facetSkepticalEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "court.jury-vote",
    leans: [
      {
        option: "acquit",
        trait: "personality-v1:facet-skeptical",
        pole: "high",
        explanation:
          "They want to know what supports the charge before relying on it.",
      },
    ],
  },
];
