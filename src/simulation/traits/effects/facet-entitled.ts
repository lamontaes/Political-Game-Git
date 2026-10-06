import type { TraitEffectDeclaration, TraitPack } from "../../trait-packs";

/** Entitlement expects preferential treatment beyond established obligations.
 * Its vote argument reinforces an evidenced position, never invents one.
 * Expectations do not create privileges or override eligibility constraints.
 * Absence of this one-sided tendency contributes nothing and is not modesty.
 */
export const facetEntitledEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "legislation.member-vote",
    leans: ["vote-yea", "vote-nay"].map((option) => ({
      option,
      trait: "personality-v1:facet-entitled",
      pole: "high" as const,
      explanation:
        "They expect their recorded position to receive priority over requests for further review.",
    })),
  },
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "fundraiser",
        trait: "personality-v1:facet-entitled",
        pole: "high",
        explanation:
          "They favor a fundraiser where they expect preferential access and recognition.",
      },
    ],
  },
  {
    decision: "campaign.support-request",
    leans: [
      {
        option: "decline",
        trait: "personality-v1:facet-entitled",
        pole: "high",
        explanation:
          "They want special recognition before lending the backing being requested.",
      },
    ],
  },
  {
    decision: "press.reporter-request-response",
    leans: [
      {
        option: "decline",
        trait: "personality-v1:facet-entitled",
        pole: "high",
        explanation:
          "They are reluctant to take an ordinary reporting request without preferential treatment.",
      },
    ],
  },
  {
    decision: "press.adviser-assignment-response",
    leans: [
      {
        option: "decline",
        trait: "personality-v1:facet-entitled",
        pole: "high",
        explanation:
          "They are reluctant to take an ordinary communication assignment without preferential treatment.",
      },
    ],
  },
];

export const FACET_ENTITLED_EFFECTS: TraitPack = {
  pack: "personality-effects-facet-entitled",
  traits: [],
  effects: facetEntitledEffects,
};
