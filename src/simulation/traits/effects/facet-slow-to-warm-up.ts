import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * A slow-to-warm-up temperament bears on committing to a social plan before
 * the person has had time to settle into it.
 *
 * Research on behavioral inhibition describes wariness and delayed approach
 * around unfamiliar people and situations, while familiarity can make the
 * same person comfortable. Offering another day preserves the approach while
 * giving it time; this is not shyness, dislike of company, or a flat refusal.
 */
export const slowToWarmUpEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "counter",
        trait: "personality-v1:facet-slow-to-warm-up",
        pole: "high",
        explanation: "They need more time to settle into a social plan.",
      },
    ],
  },
];
