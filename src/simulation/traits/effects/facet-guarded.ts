import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Guardedness is holding back personal openness. Absence of the marked pattern contributes nothing and does not establish the opposite.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetGuardedEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "decline",
        trait: "personality-v1:facet-guarded",
        pole: "high",
        explanation:
          "They keep their guard up with someone they do not know well and decline.",
      },
    ],
  },
];
