import type { TraitEffectDeclaration, TraitPack } from "../../trait-packs";

/** Dramatic expression makes reactions conspicuous and theatrical.
 * Its vote argument reinforces an evidenced position, never invents ideology
 * or a reaction to unknown facts. It does not override eligibility constraints.
 * Absence of this one-sided manner contributes nothing and is not reserve.
 */
export const facetDramaticEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "legislation.member-vote",
    leans: ["vote-yea", "vote-nay"].map((option) => ({
      option,
      trait: "personality-v1:facet-dramatic",
      pole: "high" as const,
      explanation:
        "They want to make their recorded position conspicuous through their public vote.",
    })),
  },
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "town-hall",
        trait: "personality-v1:facet-dramatic",
        pole: "high",
        explanation:
          "They value a town hall where they can express their reactions visibly in public.",
      },
    ],
  },
  {
    decision: "campaign.support-request",
    leans: [
      {
        option: "grant",
        trait: "personality-v1:facet-dramatic",
        pole: "high",
        explanation:
          "They value giving a conspicuous public affirmation through the requested backing.",
      },
    ],
  },
  {
    decision: "press.reporter-request-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-dramatic",
        pole: "high",
        explanation:
          "They value making their public explanation conspicuous during the reporting exchange.",
      },
    ],
  },
  {
    decision: "press.adviser-assignment-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-dramatic",
        pole: "high",
        explanation:
          "They value making the assigned public explanation conspicuous.",
      },
    ],
  },
];

export const FACET_DRAMATIC_EFFECTS: TraitPack = {
  pack: "personality-effects-facet-dramatic",
  traits: [],
  effects: facetDramaticEffects,
};
