import type { TraitEffectDeclaration, TraitPack } from "../../trait-packs";

/** Mischievousness concerns playful, low-stakes tests of social boundaries.
 * It supplies no legislative vote: the vote hook exposes no low-stakes seam.
 * Absence contributes nothing and does not imply solemnity or obedience.
 * Existing eligibility and other reasons continue to govern each request.
 */
export const facetMischievousEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "campaign.organizer-outreach",
    leans: [
      {
        option: "town-hall",
        trait: "personality-v1:facet-mischievous",
        pole: "high",
        explanation:
          "They favor a social gathering with room for playful exchanges that test small social boundaries.",
      },
    ],
  },
  {
    decision: "campaign.support-request",
    leans: [
      {
        option: "defer",
        trait: "personality-v1:facet-mischievous",
        pole: "high",
        explanation:
          "They favor a playful exploratory exchange before giving a settled answer to the request.",
      },
    ],
  },
  {
    decision: "press.reporter-request-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-mischievous",
        pole: "high",
        explanation:
          "They welcome an exchange where a playful question can test a small conversational boundary.",
      },
    ],
  },
  {
    decision: "press.adviser-assignment-response",
    leans: [
      {
        option: "accept",
        trait: "personality-v1:facet-mischievous",
        pole: "high",
        explanation:
          "They welcome room for playful conversational questions while considering the assignment.",
      },
    ],
  },
];

export const FACET_MISCHIEVOUS_EFFECTS: TraitPack = {
  pack: "personality-effects-facet-mischievous",
  traits: [],
  effects: facetMischievousEffects,
};
