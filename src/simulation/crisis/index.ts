import { createFutureTransitionHandlerRegistry } from "../future-transitions";
import {
  HEALTH_REVIEW_KEY,
  NPC_DISCLOSURE_KEY,
  healthReviewHandler,
  npcHealthDisclosureHandler,
} from "./health";
import {
  DISASTER_FEDERAL_REVIEW_KEY,
  DISASTER_REPAIR_CYCLE_KEY,
  DISASTER_STATE_REVIEW_KEY,
  disasterFederalReviewHandler,
  disasterRepairCycleHandler,
  disasterStateReviewHandler,
} from "./disaster";
import {
  HAZARD_SAMPLE_TRANSITION_KEY,
  hazardSampleHandler,
} from "./hazard-producer";
import {
  INTERNATIONAL_DECISION_KEY,
  INTERNATIONAL_RESPONSE_KEY,
  WAR_POWERS_KEY,
  internationalCycleOrDecisionHandler,
  internationalResponseHandler,
  warPowersHandler,
} from "./international";
import {
  CRIME_SAMPLE_TRANSITION_KEY,
  crimeSampleHandler,
} from "../crime/producer";
import {
  MORTALITY_DEATH_KEY,
  MORTALITY_WINDOW_KEY,
  mortalityDeathHandler,
  mortalityWindowHandler,
} from "./mortality";

export * from "./types";
export * from "./records";
export * from "./mortality-table";
export * from "./hazard";
export * from "./mortality";
export * from "./health";
export * from "./health-queries";
export * from "./offices";
export * from "./continuity";
export * from "./notices";
export * from "./disaster";
export * from "./disaster-warrants";
export * from "./hazard-producer";
export * from "./international";

/** Every CRISIS due-item handler, for composition into the production registry. */
export function createCrisisTransitionRegistry() {
  return createFutureTransitionHandlerRegistry([
    [MORTALITY_WINDOW_KEY, mortalityWindowHandler],
    [MORTALITY_DEATH_KEY, mortalityDeathHandler],
    [HEALTH_REVIEW_KEY, healthReviewHandler],
    [NPC_DISCLOSURE_KEY, npcHealthDisclosureHandler],
    [HAZARD_SAMPLE_TRANSITION_KEY, hazardSampleHandler],
    // Ordinary local crime shares the crisis namespace so every clock path
    // settles it; the module itself lives in `../crime`.
    [CRIME_SAMPLE_TRANSITION_KEY, crimeSampleHandler],
    [DISASTER_STATE_REVIEW_KEY, disasterStateReviewHandler],
    [DISASTER_FEDERAL_REVIEW_KEY, disasterFederalReviewHandler],
    [DISASTER_REPAIR_CYCLE_KEY, disasterRepairCycleHandler],
    [INTERNATIONAL_DECISION_KEY, internationalCycleOrDecisionHandler],
    [INTERNATIONAL_RESPONSE_KEY, internationalResponseHandler],
    [WAR_POWERS_KEY, warPowersHandler],
  ]);
}
