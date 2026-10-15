import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Politeness is courteous conduct toward others. Absence of the marked pattern contributes nothing and does not establish the opposite.
 * The receiving decision still owns eligibility and every other reason; this
 * reader contributes only the person's recorded trait.
 */
export const facetPoliteEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-polite",
        pole: "high",
      },
    ],
  },
  {
    decision: "campaign.door-answer",
    leans: [
      {
        option: "talk",
        trait: "personality-v1:facet-polite",
        pole: "high",
      },
    ],
  },
];
