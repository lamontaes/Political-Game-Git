import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Ambition is seeking advancement, responsibility or meaningful achievement. Absence of the marked pattern contributes nothing and does not establish the opposite.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetAmbitiousEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "seek",
        trait: "personality-v1:facet-ambitious",
        pole: "high",
        explanation:
          "They want the advancement and responsibility another term brings.",
      },
    ],
  },
];
