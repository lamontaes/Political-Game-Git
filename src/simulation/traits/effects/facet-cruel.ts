import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * A cruel person sometimes uses humiliation or suffering as a means or an end.
 * On a jury that is a reason to want the defendant to pay, which leans toward a
 * guilty vote. It is an argument, not a rule: the evidence in the case, the
 * burden of proof, the room and every other recorded reason stay in the same
 * ballot, and a juror who holds the state to its proof still can.
 */
export const facetCruelEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "court.jury-vote",
    leans: [
      {
        option: "convict",
        trait: "personality-v1:facet-cruel",
        pole: "high",
        explanation: "They want to see the defendant made to pay.",
      },
    ],
  },
];
