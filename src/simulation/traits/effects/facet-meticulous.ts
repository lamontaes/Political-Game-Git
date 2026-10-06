import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Meticulous people are inclined to keep responsibility for work whose details
 * they are still accountable for. The decision remains free to weigh health,
 * family, and every other recorded consideration against this reason.
 */
export const facetMeticulousEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "seek",
        trait: "personality-v1:facet-meticulous",
        pole: "high",
        explanation:
          "They want to see the office's unfinished details through.",
      },
    ],
  },
];
