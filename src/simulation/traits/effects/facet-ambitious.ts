import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Ambition is seeking advancement, responsibility or meaningful achievement.
 * An officeholder weighing another term leans toward seeking it. The catalog
 * marks the trait one-sided, so only its high pole argues; no marked ambition
 * says nothing about wanting to stop.
 */
export const facetAmbitiousEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "seek",
        trait: "personality-v1:facet-ambitious",
        pole: "high",
      },
    ],
  },
];
