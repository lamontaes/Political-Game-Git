import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Bond loyalty is the weight an established allegiance carries when other
 * motives compete. It argues only where a person already holds a bond; the
 * receiving decision still owns eligibility and consent, so loyalty never
 * overrides either.
 */
export const bondLoyaltyEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "people.couple-stage",
    leans: [
      {
        option: "stay",
        trait: "personality-v1:bond-loyalty",
        pole: "high",
      },
      {
        option: "break-up",
        trait: "personality-v1:bond-loyalty",
        pole: "low",
      },
    ],
  },
];
