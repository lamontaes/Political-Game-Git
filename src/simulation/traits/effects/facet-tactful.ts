import type { TraitEffectDeclaration } from "../../trait-packs";

/** Tact adjusts delivery to avoid putting other people on the spot. */
export const facetTactfulEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "phone-shift",
        trait: "personality-v1:facet-tactful",
        pole: "high",
        explanation:
          "They favor a private call over surprising people at their doors.",
      },
    ],
  },
];
