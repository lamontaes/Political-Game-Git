import type { TraitEffectDeclaration } from "../../trait-packs";

/** Imagination gives unusual possibilities a fair hearing. */
export const facetImaginativeEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "candidate-guidance",
        trait: "personality-v1:facet-imaginative",
        pole: "high",
        explanation:
          "They like to explore new possibilities with a prospective candidate.",
      },
    ],
  },
];
