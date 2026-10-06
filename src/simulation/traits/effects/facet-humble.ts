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
        explanation:
          "They want to hear others' contributions before treating their own judgment as final.",
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
        explanation:
          "They value a chapter meeting where others can contribute and share credit for the work.",
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
        explanation:
          "They want other chapter members heard before presenting the chapter's backing as their own decision.",
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
        explanation:
          "They value an exchange that can acknowledge the people who contributed to the reporting.",
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
        explanation:
          "They value explaining the office's shared work without claiming the credit personally.",
      },
    ],
  },
];

export const FACET_HUMBLE_EFFECTS: TraitPack = {
  pack: "personality-effects-facet-humble",
  traits: [],
  effects: facetHumbleEffects,
};
