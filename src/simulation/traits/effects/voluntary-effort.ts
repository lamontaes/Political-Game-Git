import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Voluntary effort is the work a person puts in beyond what is required. It bears on whether a worker stays in the job.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const voluntaryEffortEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "labor.worker-quit",
    leans: [
      {
        option: "continue-work",
        trait: "personality-v1:voluntary-effort",
        pole: "high",
        explanation:
          "They keep putting in effort at the job beyond what is asked.",
      },
      {
        option: "quit",
        trait: "personality-v1:voluntary-effort",
        pole: "low",
        explanation:
          "They put in only what is required and leave when the job stops being worth it.",
      },
    ],
  },
];
