import {
  PLACE_OUTCOMES_TRANSITION_KEY,
  placeOutcomesHandler,
} from "../outcome-web/place-outcomes";
import {
  PUBLIC_BUDGETS_TRANSITION_KEY,
  publicBudgetsHandler,
} from "../public-budgets";
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
  HAZARD_EPISODE_TRANSITION_KEY,
  HAZARD_SAMPLE_TRANSITION_KEY,
  hazardEpisodeHandler,
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
import { FATAL_ILLNESS_ONSET_KEY } from "./death-causes";
import { EPIDEMIC_PASS_KEY, epidemicPassHandler } from "./epidemic";
import {
  OFFICIAL_FUNERAL_KEY,
  officialFuneralHandler,
} from "./official-funeral";
import { fatalIllnessOnsetHandler } from "./fatal-illness";
import { CONDITION_ONSET_KEY } from "./condition-pack";
import { conditionOnsetHandler } from "./condition-onset";
import { HEALTH_COVERAGE_KEY } from "./health-coverage";
import { healthCoveragePassHandler } from "./health-coverage-pass";
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
export * from "./death-causes";
export * from "./fatal-illness";
export * from "./condition-pack";
export * from "./condition-onset";
export * from "./health";
export * from "./health-queries";
export * from "./offices";
export * from "./continuity";
export * from "./notices";
export * from "./disaster";
export * from "./disaster-warrants";
export * from "./hazard-producer";
export * from "./international";
export * from "./epidemic";
export * from "./official-funeral";
export * from "./health-coverage";

/** Every CRISIS due-item handler, for composition into the production registry. */
export function createCrisisTransitionRegistry() {
  return createFutureTransitionHandlerRegistry([
    [MORTALITY_WINDOW_KEY, mortalityWindowHandler],
    [MORTALITY_DEATH_KEY, mortalityDeathHandler],
    [FATAL_ILLNESS_ONSET_KEY, fatalIllnessOnsetHandler],
    // A chronic condition beginning on its own strain crossing (Ruling 38).
    [CONDITION_ONSET_KEY, conditionOnsetHandler],
    [HEALTH_REVIEW_KEY, healthReviewHandler],
    [NPC_DISCLOSURE_KEY, npcHealthDisclosureHandler],
    // Illness spreading between named people, and officials' closures.
    [EPIDEMIC_PASS_KEY, epidemicPassHandler],
    // A death in office is followed by the official's funeral.
    [OFFICIAL_FUNERAL_KEY, officialFuneralHandler],
    // Who holds Medicaid expansion coverage, and the death risk it lowers.
    [HEALTH_COVERAGE_KEY, healthCoveragePassHandler],
    [HAZARD_SAMPLE_TRANSITION_KEY, hazardSampleHandler],
    [HAZARD_EPISODE_TRANSITION_KEY, hazardEpisodeHandler],
    // Ordinary local crime shares the crisis namespace so every clock path
    // settles it; the module itself lives in `../crime`.
    [CRIME_SAMPLE_TRANSITION_KEY, crimeSampleHandler],
    // Place outcomes (the outcome web) settle on every clock path too.
    [PLACE_OUTCOMES_TRANSITION_KEY, placeOutcomesHandler],
    // Every government's budget settles its month on every clock path too.
    [PUBLIC_BUDGETS_TRANSITION_KEY, publicBudgetsHandler],
    [DISASTER_STATE_REVIEW_KEY, disasterStateReviewHandler],
    [DISASTER_FEDERAL_REVIEW_KEY, disasterFederalReviewHandler],
    [DISASTER_REPAIR_CYCLE_KEY, disasterRepairCycleHandler],
    [INTERNATIONAL_DECISION_KEY, internationalCycleOrDecisionHandler],
    [INTERNATIONAL_RESPONSE_KEY, internationalResponseHandler],
    [WAR_POWERS_KEY, warPowersHandler],
  ]);
}
