import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * Calm bears on a person's immediate response to a bargaining offer.
 *
 * Experimental work on social decisions found that regulating the emotion
 * prompted by an unfair offer increased acceptance. The catalog's narrower
 * calm facet describes a measured immediate reaction, not a lack of feeling
 * or automatic compliance, so it argues for working with the offer without
 * overruling the member's interests, commitments, or view of its terms.
 *
 * Research boundary: https://pmc.ncbi.nlm.nih.gov/articles/PMC3057682/
 */
export const calmEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "legislation.bargaining.answer-offer",
    leans: [
      {
        option: "take-the-offer",
        trait: "personality-v1:facet-calm",
        pole: "high",
        explanation:
          "They respond to the offer without letting the immediate friction decide for them.",
      },
    ],
  },
];
