import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Intimacy-guardedness can lead someone to keep private matters private and
 * take distance as a relationship becomes emotionally close. It does not mean
 * a person cannot care or must leave.
 */
export const facetIntimacyGuardedEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "press.subject-response",
    leans: [
      {
        option: "decline",
        trait: "personality-v1:facet-intimacy-guarded",
        pole: "high",
        explanation: "They prefer to keep personal matters private.",
      },
    ],
  },
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
