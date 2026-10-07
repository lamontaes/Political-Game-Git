import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Ambition is seeking advancement, responsibility or meaningful achievement.
 * An officeholder weighing another term leans toward seeking it. The catalog
 * marks the trait one-sided, so only its high pole argues; no marked ambition
 * says nothing about wanting to stop.
 */
export const facetAmbitiousEffects: readonly TraitEffectDeclaration[] = [
  ...[
    "election.consider-congress-run",
    "election.consider-state-legislative-run",
  ].map((decision) => ({
    decision,
    leans: [
      {
        option: "run",
        trait: "personality-v1:facet-ambitious",
        pole: "high" as const,
        explanation:
          "They seek responsibility and meaningful achievement, so taking on public office appeals to them.",
      },
    ],
  })),
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "seek",
        trait: "personality-v1:facet-ambitious",
        pole: "high",
        explanation:
          "They want more responsibility and a larger achievement to point to, so another term is the next step.",
      },
    ],
  },
];
