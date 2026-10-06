import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Outward emotional display bears on whether a person communicates hardship by
 * asking for clemency or keeps bearing it without an outward appeal.
 *
 * The trait is about expression, not how strongly somebody feels. Experience-
 * sampling research defines emotional expressivity as outward display across
 * channels and finds it associated with more social contact, while disclosure
 * research finds that expressing emotion communicates needs and can elicit
 * support. These rows therefore affect the act of asking, never the merits or
 * outcome of the petition.
 *
 * Research:
 * - https://pmc.ncbi.nlm.nih.gov/articles/PMC4803035/
 * - https://pmc.ncbi.nlm.nih.gov/articles/PMC2922991/
 */
export const outwardEmotionalDisplayEffects: readonly TraitEffectDeclaration[] =
  [
    {
      decision: "clemency.petition",
      leans: [
        {
          option: "petition",
          trait: "personality-v1:outward-emotional-display",
          pole: "high",
          explanation:
            "They readily communicate what the sentence is costing them and ask for relief.",
        },
        {
          option: "wait",
          trait: "personality-v1:outward-emotional-display",
          pole: "low",
          explanation:
            "They tend to bear the difficulty without making an outward appeal.",
        },
      ],
    },
  ];
