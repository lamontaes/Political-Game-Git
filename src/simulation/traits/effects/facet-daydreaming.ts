import type { TraitEffectDeclaration } from "../../trait-packs";

/** Daydreaming can pull attention away from an immediate public response. */
export const facetDaydreamingEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "press.subject-response",
    leans: [
      {
        option: "no-response",
        trait: "personality-v1:facet-daydreaming",
        pole: "high",
        explanation: "Their attention wanders from the immediate request.",
      },
    ],
  },
];
