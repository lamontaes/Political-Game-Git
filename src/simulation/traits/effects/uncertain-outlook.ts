import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Optimism is the expectation of attainable improvement under uncertainty, subject to known evidence. It bears on whether an officeholder seeks another term.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const uncertainOutlookEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "seek",
        trait: "personality-v1:uncertain-outlook",
        pole: "high",
      },
      {
        option: "step-down",
        trait: "personality-v1:uncertain-outlook",
        pole: "low",
      },
    ],
  },
];
