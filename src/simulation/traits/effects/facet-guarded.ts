import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * A guarded person protects their intentions and vulnerabilities until
 * confidence is earned. When somebody asks to meet, that is a reason to hold
 * back rather than agree at once. It is an argument, not a rule: the history
 * between the two, the day, what they have to give up and every other recorded
 * reason stay in the same answer.
 */
export const facetGuardedEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "decline",
        trait: "personality-v1:facet-guarded",
        pole: "high",
        explanation:
          "They do not open themselves up before they trust someone.",
      },
    ],
  },
];
