import type { DecisionDeclaration } from "./trait-packs";

/** The choices available after a candidate makes an individual donor ask. */
export const CAMPAIGN_DONOR_ASK_DECISION: DecisionDeclaration = {
  id: "campaign.donor-ask",
  scope: "life:ordinary",
  options: ["give", "decline"],
};
