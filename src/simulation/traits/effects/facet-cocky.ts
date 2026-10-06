import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Cockiness is an inflated reading of one's own ability. It therefore bears
 * on the actor's willingness to enter another contest for office; it does not
 * stand in for competence, popularity, money, or any other reason in that
 * decision.
 */
export const effects: readonly TraitEffectDeclaration[] = [
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "seek",
        trait: "personality-v1:facet-cocky",
        pole: "high",
        explanation:
          "They rate their own chances highly and expect to prevail again.",
      },
    ],
  },
];
