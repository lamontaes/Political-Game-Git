import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Method revision is openness or resistance to changing an established method. It bears on whether someone takes up another person's request.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const methodRevisionEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:method-revision",
        pole: "high",
        explanation:
          "They readily change their own plans when someone offers a workable alternative.",
      },
      {
        option: "decline",
        trait: "personality-v1:method-revision",
        pole: "low",
        explanation:
          "They resist changing an established approach and turn the request down.",
      },
    ],
  },
];
