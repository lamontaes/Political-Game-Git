import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Duty-bound people keep commitments they have taken on. Absence of the marked pattern contributes nothing and does not establish the opposite.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetDutyBoundEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "labor.worker-quit",
    leans: [
      {
        option: "continue-work",
        trait: "personality-v1:facet-duty-bound",
        pole: "high",
        explanation: "They feel bound to the job they took on and stay in it.",
      },
    ],
  },
];
