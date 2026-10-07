import type { TraitEffectDeclaration } from "../../trait-packs";

/** A playful manner favors convivial public contact; a serious manner favors a direct call. */
export const playfulMannerEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "town-hall",
        trait: "personality-v1:playful-manner",
        pole: "high",
        explanation: "They favor a lively public gathering for the outreach.",
      },
      {
        option: "phone-shift",
        trait: "personality-v1:playful-manner",
        pole: "low",
        explanation:
          "They favor a purposeful one-to-one call for the outreach.",
      },
    ],
  },
];
