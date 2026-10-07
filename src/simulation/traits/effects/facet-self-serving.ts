import type { TraitEffectDeclaration } from "../../trait-packs";

/** Self-serving priorities give personal benefit unusual weight. */
export const facetSelfServingEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "not-now",
        trait: "personality-v1:facet-self-serving",
        pole: "high",
        explanation:
          "They put their own time ahead of an optional campaign activity.",
      },
    ],
  },
];
