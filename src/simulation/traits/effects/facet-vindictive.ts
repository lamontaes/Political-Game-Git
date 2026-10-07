import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Vindictive people keep grievances salient and look for a way to answer
 * them. In a live press request, that tendency supports a direct dispute.
 */
export const facetVindictiveEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "press.subject-response",
    leans: [
      {
        option: "dispute",
        trait: "personality-v1:facet-vindictive",
        pole: "high",
        explanation:
          "They keep the grievance salient and answer the account directly.",
      },
    ],
  },
];
