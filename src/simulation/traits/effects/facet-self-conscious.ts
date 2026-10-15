import type { TraitEffectDeclaration, TraitPack } from "../../trait-packs";

/** Self-consciousness concerns being observed and evaluated.
 * Absence of this one-sided quality contributes nothing and is not confidence.
 * Its reasons join existing circumstances and never bypass eligibility.
 */
export const facetSelfConsciousEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "legislation.member-vote",
    leans: [
      {
        option: "withhold",
        trait: "personality-v1:facet-self-conscious",
        pole: "high",
      },
    ],
  },
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "phone-shift",
        trait: "personality-v1:facet-self-conscious",
        pole: "high",
      },
    ],
  },
  {
    decision: "campaign.support-request",
    leans: [
      {
        option: "defer",
        trait: "personality-v1:facet-self-conscious",
        pole: "high",
      },
    ],
  },
  {
    decision: "press.reporter-request-response",
    leans: [
      {
        option: "defer",
        trait: "personality-v1:facet-self-conscious",
        pole: "high",
      },
    ],
  },
  {
    decision: "press.adviser-assignment-response",
    leans: [
      {
        option: "decline",
        trait: "personality-v1:facet-self-conscious",
        pole: "high",
      },
    ],
  },
];

export const FACET_SELF_CONSCIOUS_EFFECTS: TraitPack = {
  pack: "personality-effects-facet-self-conscious",
  traits: [],
  effects: facetSelfConsciousEffects,
};
