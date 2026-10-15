import type { TraitEffectDeclaration } from "../../trait-packs";

/** Favorable reactions matter more when someone is asked to answer publicly. */
export const facetApprovalSeekingEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "press.subject-response",
    leans: [
      {
        option: "dispute",
        trait: "personality-v1:facet-approval-seeking",
        pole: "high",
        explanation: "They want others to view them favorably.",
      },
    ],
  },
];
