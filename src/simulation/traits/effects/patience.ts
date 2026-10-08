import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Patience is tolerance of a necessary delay while an objective stays viable.
 * At work it bears on whether someone stays through a slow stretch or leaves
 * for something sooner; the quit decision still owns every other reason.
 */
export const patienceEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "labor.worker-quit",
    leans: [
      {
        option: "continue-work",
        trait: "personality-v1:patience",
        pole: "high",
      },
      {
        option: "quit",
        trait: "personality-v1:patience",
        pole: "low",
      },
    ],
  },
];
