import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Light-heartedness keeps relatively minor setbacks in proportion, so a
 * routine rough patch at work does not by itself push someone to quit.
 * The decision still owns eligibility and every other reason; this reader
 * contributes only the person's recorded tendency.
 */
export const facetLightHeartedEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "labor.worker-quit",
    leans: [
      {
        option: "continue-work",
        trait: "personality-v1:facet-light-hearted",
        pole: "high",
        explanation:
          "They keep a rough patch at work in perspective and stay on the job.",
      },
    ],
  },
];
