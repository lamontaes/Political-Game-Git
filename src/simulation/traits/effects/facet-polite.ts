import type { TraitEffectDeclaration, TraitPack } from "../../trait-packs";

/** Politeness uses conventional courtesies and respects turn-taking.
 * It can give others their turn, never supply a policy view or override
 * eligibility. Absence of this one-sided manner contributes nothing, not rudeness.
 */
export const facetPoliteEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "legislation.member-vote",
    leans: [
      {
        option: "withhold",
        trait: "personality-v1:facet-polite",
        pole: "high",
        explanation:
          "They want to give colleagues their turn before offering their own final answer.",
      },
    ],
  },
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "organization-meeting",
        trait: "personality-v1:facet-polite",
        pole: "high",
        explanation:
          "They value a chapter meeting where participants can take their turns courteously.",
      },
    ],
  },
  {
    decision: "campaign.support-request",
    leans: [
      {
        option: "defer",
        trait: "personality-v1:facet-polite",
        pole: "high",
        explanation:
          "They want chapter participants to have their turns before answering the request for backing.",
      },
    ],
  },
  {
    decision: "press.reporter-request-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-polite",
        pole: "high",
        explanation:
          "They see taking part in the requested professional exchange as a courteous response.",
      },
    ],
  },
  {
    decision: "press.adviser-assignment-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-polite",
        pole: "high",
        explanation:
          "They see accepting the professional communication request as a courteous response.",
      },
    ],
  },
];

export const FACET_POLITE_EFFECTS: TraitPack = {
  pack: "personality-effects-facet-polite",
  traits: [],
  effects: facetPoliteEffects,
};
