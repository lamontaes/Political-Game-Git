import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * A playful challenger can keep a close invitation open by proposing another
 * time; this does not make an unmarked person aloof or unwilling to meet.
 */
export const facetTeasingEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "counter",
        trait: "personality-v1:facet-teasing",
        pole: "high",
        explanation:
          "They keep the invitation going with a playful alternative time.",
      },
    ],
  },
];
