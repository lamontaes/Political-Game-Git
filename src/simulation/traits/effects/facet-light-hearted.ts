import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Keeping minor setbacks in proportion can help someone stay through a rough
 * stretch at work. This tendency says nothing about responses to grave harm;
 * an unmarked record contributes no opposite pressure.
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
          "They keep a minor rough patch in proportion and continue working.",
      },
    ],
  },
];
