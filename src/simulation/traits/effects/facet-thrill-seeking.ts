import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * A thrill-seeking officeholder is drawn toward the uncertain public contest
 * rather than toward the settled end of a term. This is an argument, not an
 * outcome: health, family, the office and every other recorded reason still
 * meet it in the decision engine.
 */
const thrillSeekingEffects = [
  {
    decision: "career.consider-another-term",
    leans: [
      {
        option: "seek",
        trait: "personality-v1:facet-thrill-seeking",
        pole: "high",
        explanation:
          "The uncertainty and intensity of another contest appeal to them.",
      },
    ],
  },
] as const satisfies readonly TraitEffectDeclaration[];

export default thrillSeekingEffects;
