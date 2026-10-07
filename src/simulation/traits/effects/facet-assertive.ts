import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Assertiveness is stating needs and boundaries without attacking. Absence of the marked pattern contributes nothing and does not establish the opposite.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetAssertiveEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "counter",
        trait: "personality-v1:facet-assertive",
        pole: "high",
        explanation:
          "They state what they need and set their own terms rather than simply agreeing.",
      },
    ],
  },
];
