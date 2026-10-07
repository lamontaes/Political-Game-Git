import type { TraitEffectDeclaration } from "../../trait-packs";

/** Selective framing can bear on how someone answers a press request. */
export const facetManipulativeEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "press.subject-response",
    leans: [
      {
        option: "dispute",
        trait: "personality-v1:facet-manipulative",
        pole: "high",
        explanation:
          "Tries to shape another's choices through selective framing and pressure.",
      },
    ],
  },
];
