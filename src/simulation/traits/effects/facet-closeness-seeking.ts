import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Closeness-seeking values reassurance and shared time in close bonds. These
 * rows apply only after the relationship decisions have established that the
 * relationship is available; they add a reason without changing eligibility.
 */
export const facetClosenessSeekingEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "people.date-answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-closeness-seeking",
        pole: "high",
        explanation: "They value reassurance and shared time together.",
      },
    ],
  },
  {
    decision: "people.couple-answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-closeness-seeking",
        pole: "high",
        explanation: "They want the reassurance of a closer bond.",
      },
    ],
  },
  {
    decision: "people.couple-stage",
    leans: [
      {
        option: "stay",
        trait: "personality-v1:facet-closeness-seeking",
        pole: "high",
        explanation: "They value continued shared time in this bond.",
      },
    ],
  },
];
