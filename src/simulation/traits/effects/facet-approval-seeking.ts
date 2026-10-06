import type { TraitEffectDeclaration, TraitPack } from "../../trait-packs";

/** Approval seeking places particular weight on favorable reactions.
 * It can favor hearing reactions before committing, but supplies no policy
 * position. Absence contributes nothing and does not establish autonomy.
 */
export const facetApprovalSeekingEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "legislation.member-vote",
    leans: [
      {
        option: "withhold",
        trait: "personality-v1:facet-approval-seeking",
        pole: "high",
        explanation:
          "They want to hear others' reactions before committing to a position.",
      },
    ],
  },
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "organization-meeting",
        trait: "personality-v1:facet-approval-seeking",
        pole: "high",
        explanation:
          "They value a chapter meeting where they can hear members' reactions directly.",
      },
    ],
  },
  {
    decision: "campaign.support-request",
    leans: [
      {
        option: "grant",
        trait: "personality-v1:facet-approval-seeking",
        pole: "high",
        explanation:
          "They value a favorable reaction from the person asking for the chapter's support.",
      },
    ],
  },
  {
    decision: "press.reporter-request-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-approval-seeking",
        pole: "high",
        explanation:
          "They want to maintain a favorable professional impression by taking part in the exchange.",
      },
    ],
  },
  {
    decision: "press.adviser-assignment-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-approval-seeking",
        pole: "high",
        explanation:
          "They value the office's favorable reaction to accepting the communication assignment.",
      },
    ],
  },
];

export const FACET_APPROVAL_SEEKING_EFFECTS: TraitPack = {
  pack: "personality-effects-facet-approval-seeking",
  traits: [],
  effects: facetApprovalSeekingEffects,
};
