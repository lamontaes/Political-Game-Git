import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Work-centered people give priority to their work. Absence of the marked pattern contributes nothing and does not establish the opposite.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetWorkCenteredEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "labor.worker-quit",
    leans: [
      {
        option: "continue-work",
        trait: "personality-v1:facet-work-centered",
        pole: "high",
        explanation: "Their work matters most to them and they stay at it.",
      },
    ],
  },
];
