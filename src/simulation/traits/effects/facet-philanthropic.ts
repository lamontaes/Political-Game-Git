import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Philanthropy is turning concern into voluntary material or service support. Absence of the marked pattern contributes nothing and does not establish the opposite.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetPhilanthropicEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "clemency.petition",
    leans: [
      {
        option: "petition",
        trait: "personality-v1:facet-philanthropic",
        pole: "high",
        explanation:
          "They turn concern for someone's plight into action on their behalf.",
      },
    ],
  },
];
