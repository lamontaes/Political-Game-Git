import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Philanthropy is turning concern into voluntary material or service support.
 * An organizer choosing how to reach people picks the plain volunteer work: a
 * philanthropic one knocks on doors. The catalog marks the trait one-sided, so
 * only its high pole argues; no marked philanthropy says nothing about
 * stinginess.
 */
export const facetPhilanthropicEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "door-canvass",
        trait: "personality-v1:facet-philanthropic",
        pole: "high",
        explanation:
          "They turn concern into hands-on volunteer service, so they take the work of walking the doors.",
      },
    ],
  },
];
