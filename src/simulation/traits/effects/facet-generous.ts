import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Generosity is readily sharing available resources or time. Absence of the marked pattern contributes nothing and does not establish the opposite.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetGenerousEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-generous",
        pole: "high",
        explanation: "They readily give their time when someone asks.",
      },
    ],
  },
];
