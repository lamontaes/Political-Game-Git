import type { TraitEffectDeclaration } from "../../trait-packs";

const BRAZEN_TRAIT = "personality-v1:facet-brazen";

/**
 * Brazen people are less restrained by embarrassment and social risk. That
 * makes a conspicuous quid-pro-quo approach more plausible than either an
 * ordinary contribution or waiting, without making the approach inevitable.
 */
export const facetBrazenEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "mogul.approach",
    leans: [
      {
        option: "deal",
        trait: BRAZEN_TRAIT,
        pole: "high",
        explanation:
          "They are not easily checked by the embarrassment of making an audacious offer.",
      },
    ],
  },
];
