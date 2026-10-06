import type { TraitEffectDeclaration, TraitPack } from "../../trait-packs";

/** Smugness concerns dwelling on satisfaction with one's achievements.
 * These modest reasons cannot invent particular achievements or a vote position.
 * Absence of this one-sided quality contributes nothing and is not humility.
 */
export const facetSmugEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "legislation.member-vote",
    leans: ["vote-yea", "vote-nay"].map((option) => ({
      option,
      trait: "personality-v1:facet-smug",
      pole: "high" as const,
      explanation:
        "They dwell on satisfaction with their own judgment when standing behind a recorded position.",
    })),
  },
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "town-hall",
        trait: "personality-v1:facet-smug",
        pole: "high",
        explanation:
          "They favor a public forum that draws attention to work they feel satisfied with.",
      },
    ],
  },
  {
    decision: "campaign.support-request",
    leans: [
      {
        option: "defer",
        trait: "personality-v1:facet-smug",
        pole: "high",
        explanation:
          "They want to dwell on the chapter's existing accomplishments before endorsing another campaign.",
      },
    ],
  },
  {
    decision: "press.reporter-request-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-smug",
        pole: "high",
        explanation:
          "They welcome an exchange that lets them dwell on satisfaction with their reporting work.",
      },
    ],
  },
  {
    decision: "press.adviser-assignment-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-smug",
        pole: "high",
        explanation:
          "They welcome explaining work they feel satisfied with in a public assignment.",
      },
    ],
  },
];

export const FACET_SMUG_EFFECTS: TraitPack = {
  pack: "personality-effects-facet-smug",
  traits: [],
  effects: facetSmugEffects,
};
