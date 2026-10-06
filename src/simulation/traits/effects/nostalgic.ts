import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Nostalgia is a sentimental return to meaningful earlier relationships and
 * experiences. Experimental research connects it with social connectedness,
 * approach-oriented social goals, and intentions to engage with other people.
 * It therefore argues for accepting contact rather than making nostalgia a
 * general preference for old institutions, jobs, or policies.
 *
 * Research:
 * - https://doi.org/10.1016/j.copsyc.2022.101545
 * - https://pmc.ncbi.nlm.nih.gov/articles/PMC7324708/
 */
export const nostalgicEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-nostalgic",
        pole: "high",
        explanation:
          "Remembering meaningful times together draws them back into contact.",
      },
    ],
  },
];
