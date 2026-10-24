/**
 * The government measures the outcome web reads as causes (see gov-measures.ts
 * for what each reads). Kept apart from the engines that compute them so the
 * web's model can tell which causes the core can read.
 */
export const GOV_MEASURES = [
  "labor.minimum-wage-change-pct",
  "labor.minimum-wage-gap-to-15",
  "election.incumbent-vote",
  "election.incumbent-reelection",
  "voting.local-turnout",
  "budget.parks-added-pct",
  "labor.minimum-wage",
  "labor.minimum-wage-to-median",
  "voting.youth-turnout",
  "voting.party-share",
] as const;
