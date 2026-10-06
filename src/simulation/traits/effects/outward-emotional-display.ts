import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Outward emotional display is communicating rather than restraining felt emotion. It bears on whether someone answers a reporter's request.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const outwardEmotionalDisplayEffects: readonly TraitEffectDeclaration[] =
  [
    {
      decision: "press.reporter-request-response",
      leans: [
        {
          option: "accept",
          trait: "personality-v1:outward-emotional-display",
          pole: "high",
          explanation:
            "They say what they feel openly, so a reporter's question gets an answer.",
        },
        {
          option: "decline",
          trait: "personality-v1:outward-emotional-display",
          pole: "low",
          explanation:
            "They keep their feelings to themselves and turn the reporter down.",
        },
      ],
    },
  ];
