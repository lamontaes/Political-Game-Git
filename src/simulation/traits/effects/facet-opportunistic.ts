import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * An opportunistic officeholder notices that holding the seat offers another
 * useful opening. This is an argument for seeking the term, never a veto or a
 * decision by itself; the rest of the person's recorded reasons still weigh.
 */
export const facetOpportunisticEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "seek",
        trait: "personality-v1:facet-opportunistic",
        pole: "high",
        explanation:
          "They see another term as a useful opening worth pursuing.",
      },
    ],
  },
];
