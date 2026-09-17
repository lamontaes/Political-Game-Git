import { CAMPAIGN_WEEKLY_EVALUATION_KEY } from "./campaign-life-types";
import { campaignWeeklyEvaluationHandler } from "./campaign-opponents";
import { CAMPAIGN_LIFE_OUTREACH_KEY } from "./campaign-life-types";
import { campaignLifeOutreachTransitionHandler } from "./campaign-life-activities";
import type { FutureTransitionHandler, FutureTransitionKey } from "./types";

/**
 * CRUNCH46 CAMPAIGN transition handlers, composed into
 * `createCampaignElectionTransitionRegistry` with one spread line so the
 * shared registry (also edited by WORLD and GOVERNING) stays one edit.
 * Filled as each increment lands.
 */
export const CAMPAIGN_LIFE_HANDLERS: readonly (readonly [
  FutureTransitionKey,
  FutureTransitionHandler,
])[] = [
  // Lane C: opponent campaigns act at weekly boundaries.
  [CAMPAIGN_WEEKLY_EVALUATION_KEY, campaignWeeklyEvaluationHandler],
  // Lane A: chapter organizers offer party and campaign activities.
  [CAMPAIGN_LIFE_OUTREACH_KEY, campaignLifeOutreachTransitionHandler],
];
