import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Bravery is readiness to act despite perceived personal threat when the purpose matters. It bears on whether an officeholder seeks another term.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const actionDespiteFearEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "seek",
        trait: "personality-v1:action-despite-fear",
        pole: "high",
        explanation:
          "They run again even though they know the race will be hard and personal.",
      },
      {
        option: "step-down",
        trait: "personality-v1:action-despite-fear",
        pole: "low",
        explanation:
          "They are deterred by the personal cost of another campaign and step aside.",
      },
    ],
  },
];
