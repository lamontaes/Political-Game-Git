import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Observant people pay attention to available behavioral and contextual cues.
 * When a live press request names them, that tendency supports answering the
 * account directly rather than letting the request pass without comment.
 */
export const facetObservantEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "press.subject-response",
    leans: [
      {
        option: "dispute",
        trait: "personality-v1:facet-observant",
        pole: "high",
        explanation:
          "They pay attention to contextual cues and answer the account directly.",
      },
    ],
  },
];
