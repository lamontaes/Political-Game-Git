import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Forgiveness is letting a recognized repair reduce the weight of a grievance. Absence of the marked pattern contributes nothing and does not establish the opposite.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetForgivingEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-forgiving",
        pole: "high",
      },
    ],
  },
];
