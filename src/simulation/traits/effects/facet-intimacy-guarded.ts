import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Intimacy-guardedness is distance in moments of emotional closeness. It does
 * not mean a person cannot care or must leave; these rows contribute only
 * when the relationship is becoming close or changing its level of closeness.
 */
export const facetIntimacyGuardedEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "people.couple-answer",
    leans: [
      {
        option: "decline",
        trait: "personality-v1:facet-intimacy-guarded",
        pole: "high",
        explanation:
          "They keep some distance as this relationship becomes emotionally close.",
      },
    ],
  },
  {
    decision: "people.couple-stage",
    leans: [
      {
        option: "separate",
        trait: "personality-v1:facet-intimacy-guarded",
        pole: "high",
        explanation:
          "They make room for distance as this close relationship changes.",
      },
    ],
  },
];
