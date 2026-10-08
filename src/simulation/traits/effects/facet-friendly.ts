import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Friendliness is usually beginning with a welcoming cooperative manner. Absence of the marked pattern contributes nothing and does not establish the opposite.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetFriendlyEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-friendly",
        pole: "high",
      },
    ],
  },
];
