import type { TraitEffectDeclaration } from "../../trait-packs";

/** Smug satisfaction can make a person more willing to discuss their wins. */
export const facetSmugEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "press.reporter-request-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-smug",
        pole: "high",
        explanation:
          "They enjoy talking about their own achievements when a reporter asks.",
      },
    ],
  },
];
