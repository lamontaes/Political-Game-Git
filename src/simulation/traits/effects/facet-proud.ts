import type { TraitEffectDeclaration, TraitPack } from "../../trait-packs";

/** Pride concerns dignity and recognition, not competence or superiority.
 * A vote reader reinforces an existing position; it cannot invent a position.
 * Absence of this one-sided quality contributes nothing and is not humility.
 */
export const facetProudEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "legislation.member-vote",
    leans: ["vote-yea", "vote-nay"].map((option) => ({
      option,
      trait: "personality-v1:facet-proud",
      pole: "high" as const,
      explanation:
        "They attach dignity to standing behind their recorded position.",
    })),
  },
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "town-hall",
        trait: "personality-v1:facet-proud",
        pole: "high",
        explanation:
          "They value a public forum where their chapter's work can be recognized.",
      },
    ],
  },
  {
    decision: "campaign.support-request",
    leans: [
      {
        option: "defer",
        trait: "personality-v1:facet-proud",
        pole: "high",
        explanation:
          "They want the chapter's backing treated as a considered public endorsement.",
      },
    ],
  },
  {
    decision: "press.reporter-request-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-proud",
        pole: "high",
        explanation:
          "They value recognition of their reporting role in this exchange.",
      },
    ],
  },
  {
    decision: "press.adviser-assignment-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-proud",
        pole: "high",
        explanation:
          "They value being trusted with the office's public explanation.",
      },
    ],
  },
];

export const FACET_PROUD_EFFECTS: TraitPack = {
  pack: "personality-effects-facet-proud",
  traits: [],
  effects: facetProudEffects,
};
