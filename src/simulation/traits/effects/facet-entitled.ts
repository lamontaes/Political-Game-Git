import type { TraitEffectDeclaration } from "../../trait-packs";

/** Entitlement expects access beyond ordinary obligations. */
export const facetEntitledEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "candidate-guidance",
        trait: "personality-v1:facet-entitled",
        pole: "high",
        explanation:
          "They expect individualized help with a candidate's next steps.",
      },
    ],
  },
];
