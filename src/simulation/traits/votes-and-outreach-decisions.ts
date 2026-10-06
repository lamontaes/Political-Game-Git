import type { DecisionDeclaration } from "../trait-packs";

/** Public-life choices shared by the self-image and social-manner families.
 * Their common ordinary-life scope lets each reader retain its catalog profile.
 * The receiving producers still own eligibility, evidence and available options.
 */
export const VOTES_AND_OUTREACH_DECISIONS: readonly DecisionDeclaration[] = [
  {
    id: "legislation.member-vote",
    scope: "life:ordinary",
    options: ["vote-yea", "vote-nay", "withhold"],
  },
  {
    id: "campaign.organizer-outreach",
    scope: "life:ordinary",
    options: [
      "organization-meeting",
      "door-canvass",
      "phone-shift",
      "town-hall",
      "fundraiser",
      "support-request",
      "candidate-guidance",
      "not-now",
    ],
  },
  {
    id: "campaign.support-request",
    scope: "life:ordinary",
    options: ["grant", "decline", "defer"],
  },
  {
    id: "press.reporter-request-response",
    scope: "life:ordinary",
    options: ["accept", "defer", "decline"],
  },
  {
    id: "press.adviser-assignment-response",
    scope: "life:ordinary",
    options: ["accept", "decline"],
  },
];
