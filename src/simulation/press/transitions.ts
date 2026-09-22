import { createFutureTransitionHandlerRegistry } from "../future-transitions";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerRegistry,
  FutureTransitionHandlerResult,
  World,
} from "../types";
import {
  ensurePressDeskSchedule,
  PRESS_DESK_SWEEP_TRANSITION_KEY,
  PRESS_STORY_STEP_TRANSITION_KEY,
  pressDeskSweepHandler,
  pressStoryStepHandler,
} from "./desk";
import {
  PRESS_LEDGER_REVIEW_TRANSITION_KEY,
  pressLedgerReviewHandler,
  produceCampaignFinanceScrutiny,
} from "./matters";
import { ensurePressLocalCoverage, ensurePressMediaOpening } from "./outlets";
import { ensurePressExposureCoverage } from "./views";
import {
  PRESS_PROCEEDING_TRANSITION_KEY,
  pressProceedingStepHandler,
} from "./procedures";

/**
 * The weekly desk sweep also lets a rival decide about a complaint and
 * materializes coverage for newly exposed state politics, before the outlets
 * look at the week's public record.
 */
function pressWeeklyHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  const prepared = ensurePressExposureCoverage(
    produceCampaignFinanceScrutiny(world),
  );
  return pressDeskSweepHandler(prepared, dueItem);
}

export function createPressTransitionRegistry(): FutureTransitionHandlerRegistry {
  return createFutureTransitionHandlerRegistry([
    [PRESS_DESK_SWEEP_TRANSITION_KEY, pressWeeklyHandler],
    [PRESS_STORY_STEP_TRANSITION_KEY, pressStoryStepHandler],
    [PRESS_PROCEEDING_TRANSITION_KEY, pressProceedingStepHandler],
    [PRESS_LEDGER_REVIEW_TRANSITION_KEY, pressLedgerReviewHandler],
  ]);
}

/**
 * New-life opening only: the national seed pack, local coverage for the
 * player's home, and the first weekly desk sweep. Never run on load.
 */
export function ensurePressOpening(
  world: World,
  playerPersonId: EntityId,
): World {
  return ensurePressDeskSchedule(
    ensurePressLocalCoverage(
      ensurePressMediaOpening(world, playerPersonId),
      playerPersonId,
    ),
  );
}
