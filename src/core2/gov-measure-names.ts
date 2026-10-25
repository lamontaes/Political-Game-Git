/**
 * The government measures GOV's engines record for the outcome web, by name
 * (gov-measures.ts reads each, and says its unit). Apart from the readers so
 * the web's model can count them as causes without importing the engines.
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
