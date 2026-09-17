import { createFutureTransitionHandlerRegistry } from "../future-transitions";
import {
  HEALTH_REVIEW_KEY,
  NPC_DISCLOSURE_KEY,
  healthReviewHandler,
  npcHealthDisclosureHandler,
} from "./health";
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

/** Every CRISIS due-item handler, for composition into the production registry. */
export function createCrisisTransitionRegistry() {
  return createFutureTransitionHandlerRegistry([
    [MORTALITY_WINDOW_KEY, mortalityWindowHandler],
    [MORTALITY_DEATH_KEY, mortalityDeathHandler],
    [HEALTH_REVIEW_KEY, healthReviewHandler],
    [NPC_DISCLOSURE_KEY, npcHealthDisclosureHandler],
  ]);
}
