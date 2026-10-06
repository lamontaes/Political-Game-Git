import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Compassion is the weight given to suffering a person actually understands. It bears on whether someone petitions for clemency; it is not automatic policy support.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const concernForDistressEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "clemency.petition",
    leans: [
      {
        option: "petition",
        trait: "personality-v1:concern-for-distress",
        pole: "high",
        explanation:
          "They understand what the person is going through and press the petition on their behalf.",
      },
      {
        option: "wait",
        trait: "personality-v1:concern-for-distress",
        pole: "low",
        explanation:
          "They give little weight to the person's suffering and do not act on it.",
      },
    ],
  },
];
