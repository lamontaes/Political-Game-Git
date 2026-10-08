import type { TraitEffectDeclaration } from "../../trait-packs";

/** A gradual social approach can favor declining an unfamiliar press request. */
export const facetSlowToWarmUpEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "press.subject-response",
    leans: [
      {
        option: "decline",
        trait: "personality-v1:facet-slow-to-warm-up",
        pole: "high",
        explanation: "They take time to open up to unfamiliar contacts.",
      },
    ],
  },
  {
    decision: "campaign.door-answer",
    leans: [
      {
        option: "decline",
        trait: "personality-v1:facet-slow-to-warm-up",
        pole: "high",
      },
    ],
  },
];
