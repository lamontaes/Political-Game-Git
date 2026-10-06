import type { TraitEffectDeclaration, TraitPack } from "../../trait-packs";

/** Deference initially yields space to recognized expertise or rank.
 * It supplies a reason to listen, never a policy view or unconditional obedience.
 * Absence of this one-sided manner contributes nothing and is not assertiveness.
 */
export const facetDeferentialEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "legislation.member-vote",
    leans: [
      {
        option: "withhold",
        trait: "personality-v1:facet-deferential",
        pole: "high",
        explanation:
          "They want to hear recognized colleagues' expertise before finalizing their own judgment.",
      },
    ],
  },
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "organization-meeting",
        trait: "personality-v1:facet-deferential",
        pole: "high",
        explanation:
          "They value a chapter meeting where they can hear the chapter leadership's guidance.",
      },
    ],
  },
  {
    decision: "campaign.support-request",
    leans: [
      {
        option: "defer",
        trait: "personality-v1:facet-deferential",
        pole: "high",
        explanation:
          "They want to leave room for the chapter's recognized authority before promising its backing.",
      },
    ],
  },
  {
    decision: "press.reporter-request-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-deferential",
        pole: "high",
        explanation:
          "They respect the professional remit of the person requesting the reporting exchange.",
      },
    ],
  },
  {
    decision: "press.adviser-assignment-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-deferential",
        pole: "high",
        explanation:
          "They respect the office's professional remit in assigning the communication work.",
      },
    ],
  },
];

export const FACET_DEFERENTIAL_EFFECTS: TraitPack = {
  pack: "personality-effects-facet-deferential",
  traits: [],
  effects: facetDeferentialEffects,
};
