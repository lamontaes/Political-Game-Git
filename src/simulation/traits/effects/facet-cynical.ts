import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Cynicism is distrust of others' motives.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetCynicalEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "decline",
        trait: "personality-v1:facet-cynical",
        pole: "high",
      },
    ],
  },
];
