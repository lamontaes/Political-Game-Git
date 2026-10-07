import type { TraitEffectDeclaration } from "../../trait-packs";

/** Protecting private matters can make a public response less appealing. */
export const facetIntimacyGuardedEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "press.subject-response",
    leans: [
      {
        option: "decline",
        trait: "personality-v1:facet-intimacy-guarded",
        pole: "high",
        explanation: "They prefer to keep personal matters private.",
      },
    ],
  },
];
