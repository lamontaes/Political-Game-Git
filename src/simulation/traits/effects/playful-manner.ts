import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * A playful manner bears on whether an optional social meeting sounds
 * engaging. Adult-playfulness research describes other-directed playfulness
 * as seeking situations for playful interaction and shared play, while the
 * broader construct reframes ordinary situations as entertaining or
 * interesting (Proyer et al., 2018, doi:10.3389/fpsyg.2018.00421).
 *
 * This is one reason beside available time, the relationship, felt debts,
 * privacy goals, and other traits. It does not turn playfulness into general
 * sociability or make either pole override those causes.
 */
export const playfulMannerEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:playful-manner",
        pole: "high",
        explanation:
          "They see a chance to make time together playful and engaging.",
      },
      {
        option: "decline",
        trait: "personality-v1:playful-manner",
        pole: "low",
        explanation:
          "An open-ended social visit does not offer the purposeful exchange they prefer.",
      },
    ],
  },
];
