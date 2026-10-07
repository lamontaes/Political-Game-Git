import type { TraitEffectDeclaration } from "../../trait-packs";

const BLUNT = "personality-v1:facet-blunt";

/** Decisions where a blunt manner supplies a reason of its own. */
export const facetBluntEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "counter",
        trait: BLUNT,
        pole: "high",
        explanation: "They say plainly what would need to change.",
      },
    ],
  },
];
