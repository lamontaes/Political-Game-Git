import type { TraitEffectDeclaration } from "../../trait-packs";

/** Playful disruption can show up as a public challenge to an allegation. */
export const facetMischievousEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "press.subject-response",
    leans: [
      {
        option: "dispute",
        trait: "personality-v1:facet-mischievous",
        pole: "high",
        explanation:
          "They look for playful disruption and small tests of boundaries.",
      },
    ],
  },
];
