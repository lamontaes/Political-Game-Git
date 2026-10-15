import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Contentment is placing less weight on further status once current aims are
 * met. An officeholder weighing another term leans toward stepping down. The
 * catalog marks the trait one-sided, so only its high pole argues; no marked
 * contentment says nothing about hunger for the seat.
 */
export const facetContentedEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "step-down",
        trait: "personality-v1:facet-contented",
        pole: "high",
      },
    ],
  },
];
