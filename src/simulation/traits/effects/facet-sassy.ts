import type { TraitEffectDeclaration } from "../../trait-packs";

/** A sassy manner supplies sharp, self-possessed pushback to a press account. */
export const facetSassyEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "press.subject-response",
    leans: [
      {
        option: "dispute",
        trait: "personality-v1:facet-sassy",
        pole: "high",
        explanation:
          "They answer a press account with sharp, self-possessed pushback.",
      },
    ],
  },
];
