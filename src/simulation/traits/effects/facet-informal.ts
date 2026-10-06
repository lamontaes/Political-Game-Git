import type { TraitEffectDeclaration, TraitPack } from "../../trait-packs";

/** Informality concerns avoiding ceremony and favoring conversational familiarity.
 * Its reasons cannot invent a policy position or bypass existing eligibility.
 * Absence of this one-sided quality contributes nothing and is not stiffness.
 */
export const facetInformalEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "legislation.member-vote",
    leans: ["vote-yea", "vote-nay"].map((option) => ({
      option,
      trait: "personality-v1:facet-informal",
      pole: "high" as const,
      explanation:
        "They favor stating their existing position directly without additional ceremony.",
    })),
  },
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "door-canvass",
        trait: "personality-v1:facet-informal",
        pole: "high",
        explanation:
          "They favor familiar individual conversations without the ceremony of a public gathering.",
      },
    ],
  },
  {
    decision: "campaign.support-request",
    leans: [
      {
        option: "grant",
        trait: "personality-v1:facet-informal",
        pole: "high",
        explanation:
          "They favor a straightforward conversational agreement when considering the support request.",
      },
    ],
  },
  {
    decision: "press.reporter-request-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-informal",
        pole: "high",
        explanation:
          "They favor a direct, familiar exchange when considering the reporting request.",
      },
    ],
  },
  {
    decision: "press.adviser-assignment-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-informal",
        pole: "high",
        explanation:
          "They favor a direct, familiar exchange when considering the advisory assignment.",
      },
    ],
  },
];

export const FACET_INFORMAL_EFFECTS: TraitPack = {
  pack: "personality-effects-facet-informal",
  traits: [],
  effects: facetInformalEffects,
};
