import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Bond loyalty bears on whether somebody makes time for a person with whom
 * they already have a recorded household, family, work, group, or personal
 * connection. `contact.answer` is only reached through one of those bases.
 *
 * Relationship research supports the direction, not a hidden coefficient:
 * commitment predicts accommodation when a partner acts badly and willingness
 * to sacrifice immediate self-interest for an ongoing relationship. The
 * decision engine therefore adds one ordinary consideration while retaining
 * schedule conflicts, goals, relationship standing, and every other cause.
 *
 * Sources:
 * - Rusbult et al. (1991), doi:10.1037/0022-3514.60.1.53
 * - Van Lange et al. (1997), doi:10.1037/0022-3514.72.6.1373
 */
export const bondLoyaltyEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:bond-loyalty",
        pole: "high",
        explanation: "They give weight to the bond they already share.",
      },
      {
        option: "decline",
        trait: "personality-v1:bond-loyalty",
        pole: "low",
        explanation: "Their existing bond does not hold them to this plan.",
      },
    ],
  },
];
