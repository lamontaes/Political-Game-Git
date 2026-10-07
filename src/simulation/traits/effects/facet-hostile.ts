import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * A hostile person often begins an exchange with antagonistic intent. When
 * somebody asks them to meet, that is a reason to turn the invitation down. It
 * is an argument, not a rule: the history between the two, the day, what they
 * have to give up and every other recorded reason stay in the same answer.
 */
export const facetHostileEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "decline",
        trait: "personality-v1:facet-hostile",
        pole: "high",
        explanation: "They go into most exchanges looking for a fight.",
      },
    ],
  },
];
