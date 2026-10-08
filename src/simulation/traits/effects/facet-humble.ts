import type { TraitEffectDeclaration, TraitPack } from "../../trait-packs";

/** Humility downplays personal status and shares credit, not competence.
 * It supplies a reason to hear others before claiming the final judgment;
 * it supplies no policy position. Absence is not arrogance or entitlement.
 */
export const facetHumbleEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "legislation.member-vote",
    leans: [
      {
        option: "withhold",
        trait: "personality-v1:facet-humble",
        pole: "high",
      },
    ],
  },
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "organization-meeting",
        trait: "personality-v1:facet-humble",
        pole: "high",
      },
    ],
  },
  {
    decision: "campaign.support-request",
    leans: [
      {
        option: "defer",
        trait: "personality-v1:facet-humble",
        pole: "high",
      },
    ],
  },
  {
    decision: "press.reporter-request-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-humble",
        pole: "high",
      },
    ],
  },
  {
    decision: "press.adviser-assignment-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-humble",
        pole: "high",
      },
    ],
  },
];

export const FACET_HUMBLE_EFFECTS: TraitPack = {
  pack: "personality-effects-facet-humble",
  traits: [],
  effects: facetHumbleEffects,
};
