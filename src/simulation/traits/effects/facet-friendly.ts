import type { TraitEffectDeclaration, TraitPack } from "../../trait-packs";

/** Friendliness concerns beginning with a welcoming, cooperative manner.
 * Its reasons cannot invent a policy position or bypass existing eligibility.
 * Absence of this one-sided quality contributes nothing and is not hostility.
 */
export const facetFriendlyEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "legislation.member-vote",
    leans: ["vote-yea", "vote-nay"].map((option) => ({
      option,
      trait: "personality-v1:facet-friendly",
      pole: "high" as const,
      explanation:
        "They approach the existing case for this position cooperatively rather than treating disagreement as a personal contest.",
    })),
  },
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "organization-meeting",
        trait: "personality-v1:facet-friendly",
        pole: "high",
        explanation:
          "They favor a meeting where they can welcome members into cooperative campaign work.",
      },
    ],
  },
  {
    decision: "campaign.support-request",
    leans: [
      {
        option: "grant",
        trait: "personality-v1:facet-friendly",
        pole: "high",
        explanation:
          "They begin the support request with a welcoming willingness to cooperate.",
      },
    ],
  },
  {
    decision: "press.reporter-request-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-friendly",
        pole: "high",
        explanation:
          "They approach a professional reporting request with a welcoming willingness to engage.",
      },
    ],
  },
  {
    decision: "press.adviser-assignment-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-friendly",
        pole: "high",
        explanation:
          "They approach a professional advisory request with a welcoming willingness to engage.",
      },
    ],
  },
];

export const FACET_FRIENDLY_EFFECTS: TraitPack = {
  pack: "personality-effects-facet-friendly",
  traits: [],
  effects: facetFriendlyEffects,
};
