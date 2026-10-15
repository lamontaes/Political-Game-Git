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
    })),
  },
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "town-hall",
        trait: "personality-v1:facet-proud",
        pole: "high",
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
      },
    ],
  },
];

export const FACET_PROUD_EFFECTS: TraitPack = {
  pack: "personality-effects-facet-proud",
  traits: [],
  effects: facetProudEffects,
};
