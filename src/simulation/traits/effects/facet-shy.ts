import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Shyness bears on how somebody answers a social approach.
 *
 * The facet is inhibition despite possible interest, rather than low
 * sociability. It therefore favors asking for time instead of refusing the
 * contact outright. The row contributes only when shyness is positively
 * recorded; the one-sided scale's unmarked end is not treated as boldness.
 */
export const facetShyEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "counter",
        trait: "personality-v1:facet-shy",
        pole: "high",
        explanation:
          "They feel inhibited by the social approach and ask for time before meeting.",
      },
    ],
  },
];
