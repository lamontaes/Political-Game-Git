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
        explanation:
          "They keep faith with a bond they have already built, even when other pulls compete.",
      },
      {
        option: "break-up",
        trait: "personality-v1:bond-loyalty",
        pole: "low",
        explanation:
          "They let this bond go readily once other motives outweigh it.",
      },
    ],
  },
];
