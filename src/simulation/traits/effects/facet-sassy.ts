import type { TraitEffectDeclaration, TraitPack } from "../../trait-packs";

/** Sassiness uses sharp, self-possessed verbal pushback.
 * Its vote argument reinforces an evidenced position, never invents disagreement.
 * A manner contributes a reason without overriding eligibility constraints.
 * Absence of this one-sided tendency contributes nothing and is not timidity.
 */
export const facetSassyEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "legislation.member-vote",
    leans: ["vote-yea", "vote-nay"].map((option) => ({
      option,
      trait: "personality-v1:facet-sassy",
      pole: "high" as const,
      explanation:
        "They want to push back against pressure to abandon their recorded position.",
    })),
  },
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "town-hall",
        trait: "personality-v1:facet-sassy",
        pole: "high",
        explanation:
          "They value a town hall where they can answer challenges aloud.",
      },
    ],
  },
  {
    decision: "campaign.support-request",
    leans: [
      {
        option: "decline",
        trait: "personality-v1:facet-sassy",
        pole: "high",
        explanation:
          "They want to push back verbally on the request for backing.",
      },
    ],
  },
  {
    decision: "press.reporter-request-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-sassy",
        pole: "high",
        explanation:
          "They want to answer challenging questions with self-possessed verbal pushback.",
      },
    ],
  },
  {
    decision: "press.adviser-assignment-response",
    leans: [
      {
        option: "decline",
        trait: "personality-v1:facet-sassy",
        pole: "high",
        explanation:
          "They want to push back on the communication assignment rather than simply accept it.",
      },
    ],
  },
];

export const FACET_SASSY_EFFECTS: TraitPack = {
  pack: "personality-effects-facet-sassy",
  traits: [],
  effects: facetSassyEffects,
};
