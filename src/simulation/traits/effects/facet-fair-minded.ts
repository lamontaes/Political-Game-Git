import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Fair-minded people want like cases handled under a defensible rule. When a
 * live press request challenges an account, that tendency supports answering
 * with a direct correction instead of letting the request pass.
 */
export const facetFairMindedEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "press.subject-response",
    leans: [
      {
        option: "dispute",
        trait: "personality-v1:facet-fair-minded",
        pole: "high",
        explanation:
          "They favor a consistent, defensible answer when an account is challenged.",
      },
    ],
  },
];
