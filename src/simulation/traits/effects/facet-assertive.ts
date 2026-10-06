import type { TraitEffectDeclaration, TraitPack } from "../../trait-packs";

/** Assertiveness concerns stating needs and boundaries without attacking.
 * Its modest reasons reinforce an evidenced position and preserve eligibility.
 * Absence of this one-sided quality contributes nothing and is not submission.
 */
export const facetAssertiveEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "legislation.member-vote",
    leans: ["vote-yea", "vote-nay"].map((option) => ({
      option,
      trait: "personality-v1:facet-assertive",
      pole: "high" as const,
      explanation:
        "They want to state their recorded position clearly while respecting others.",
    })),
  },
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "door-canvass",
        trait: "personality-v1:facet-assertive",
        pole: "high",
        explanation:
          "They favor direct conversations where they can ask for support and respect a refusal.",
      },
    ],
  },
  {
    decision: "campaign.support-request",
    leans: [
      {
        option: "defer",
        trait: "personality-v1:facet-assertive",
        pole: "high",
        explanation:
          "They want to state the chapter's terms before committing its support.",
      },
    ],
  },
  {
    decision: "press.reporter-request-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-assertive",
        pole: "high",
        explanation:
          "They are willing to take the exchange while stating their reporting needs and boundaries.",
      },
    ],
  },
  {
    decision: "press.adviser-assignment-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-assertive",
        pole: "high",
        explanation:
          "They are willing to take the assignment while stating the needs and boundaries of their advisory role.",
      },
    ],
  },
];

export const FACET_ASSERTIVE_EFFECTS: TraitPack = {
  pack: "personality-effects-facet-assertive",
  traits: [],
  effects: facetAssertiveEffects,
};
