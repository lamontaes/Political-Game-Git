import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Dramatic people express reactions in conspicuous, theatrical ways. During
 * a live press request, that tendency supports putting a response on record.
 */
export const facetDramaticEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "press.subject-response",
    leans: [
      {
        option: "dispute",
        trait: "personality-v1:facet-dramatic",
        pole: "high",
        explanation:
          "They express reactions conspicuously and answer the account on the record.",
      },
    ],
  },
];
