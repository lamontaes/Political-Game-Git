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
import {
  ensurePressHomeCoverage,
  ensurePressLocalCoverage,
  ensurePressMediaOpening,
} from "./outlets";
import {
  ensureMediaOwnership,
  PRESS_OWNER_REVIEW_TRANSITION_KEY,
  pressOwnerReviewHandler,
} from "./ownership";
import { ensurePressExposureCoverage } from "./views";
import {
  PRESS_PROCEEDING_TRANSITION_KEY,
  pressProceedingStepHandler,
} from "./procedures";

/**
 * The weekly desk sweep also lets a rival decide about a complaint and
 * keeps the player's own town and state covered, materializes coverage for
 * newly exposed state politics, and gives any new
 * outlet its founding owner, before the outlets look at the week's public
 * record.
 */
function pressWeeklyHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  const prepared = ensureMediaOwnership(
    ensurePressExposureCoverage(
      ensurePressHomeCoverage(produceCampaignFinanceScrutiny(world)),
    ),
  );
  return pressDeskSweepHandler(prepared, dueItem);
}

export function createPressTransitionRegistry(): FutureTransitionHandlerRegistry {
  return createFutureTransitionHandlerRegistry([
    [PRESS_DESK_SWEEP_TRANSITION_KEY, pressWeeklyHandler],
    [PRESS_STORY_STEP_TRANSITION_KEY, pressStoryStepHandler],
    [PRESS_PROCEEDING_TRANSITION_KEY, pressProceedingStepHandler],
    [PRESS_LEDGER_REVIEW_TRANSITION_KEY, pressLedgerReviewHandler],
    [
      PRESS_OWNER_REVIEW_TRANSITION_KEY,
      (world, dueItem) => pressOwnerReviewHandler(world, dueItem),
    ],
  ]);
}

/**
 * New-life opening only: the national seed pack, local coverage for the
 * player's home, each outlet's founding owner, and the first weekly desk
 * sweep. Never run on load.
 */
export function ensurePressOpening(
  world: World,
  playerPersonId: EntityId,
): World {
  return ensurePressDeskSchedule(
    ensureMediaOwnership(
      ensurePressLocalCoverage(
        ensurePressMediaOpening(world, playerPersonId),
        playerPersonId,
      ),
    ),
  );
}
