import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Smugness dwells on satisfaction with one's own achievements. When a live
 * press request challenges an account, that self-assurance supports disputing
 * it. The absence of marked smugness makes no claim about what a person says.
 */
export const facetSmugEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "press.subject-response",
    leans: [
      {
        option: "dispute",
        trait: "personality-v1:facet-smug",
        pole: "high",
        explanation:
          "They are satisfied with their own record and stand by it when challenged.",
      },
    ],
  },
];
