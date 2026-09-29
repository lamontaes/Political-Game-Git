import { makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import type {
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";
import { worldOpeningVersionOf } from "../world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { firstOfNextMonth, firstOfPreviousMonth } from "./fiscal";
import { readMonthFlows, settleGovernmentMonth } from "./month";
import { budgetCandidates, openGovernmentBudget } from "./opening";
import {
  PUBLIC_BUDGETS_VERSION,
  type PublicBudgetGovernment,
  type PublicBudgetStore,
} from "./store";

export * from "./store";
export { budgetProgramFor } from "./month";

export const PUBLIC_BUDGETS_TRANSITION_KEY = "crisis:public-budgets" as const;

/**
 * Opens a budget for every government in the world that has none yet and is
 * not already listed as unknown. Run at the opening and at each monthly pass,
 * so a county or town that enters the world later gets its books then.
 */
export function withOpenedBudgets(
  world: World,
  store: PublicBudgetStore,
  today: IsoDate,
): PublicBudgetStore {
  const known = new Set([
    ...store.governments.map((row) => row.key),
    ...store.unknown.map((row) => row.key),
  ]);
  const { candidates, unknown } = budgetCandidates(world);
  const governments: PublicBudgetGovernment[] = [...store.governments];
  const unknownRows = [...store.unknown];
  for (const row of unknown) if (!known.has(row.key)) unknownRows.push(row);
  for (const candidate of candidates) {
    if (known.has(candidate.key)) continue;
    const opened = openGovernmentBudget(world, candidate, today);
    if (typeof opened === "string")
      unknownRows.push({
        key: candidate.key,
        jurisdictionId: candidate.jurisdictionId,
        reason: opened,
      });
    else governments.push(opened);
  }
  return { ...store, governments, unknown: unknownRows };
}

/** Opens every budget and schedules the first monthly pass. Idempotent. */
export function ensurePublicBudgets(world: World): World {
  if (worldOpeningVersionOf(world) !== CRUNCH46_WORLD_OPENING_VERSION)
    return world;
  if (world.publicBudgets) return world;
  const today = makeIsoDate(world.currentDate);
  const empty: PublicBudgetStore = {
    version: PUBLIC_BUDGETS_VERSION,
    // Only what happens from the opening on is the budget's to record.
    cursor: {
      flows: world.history.resourceFlows.length,
      outcomes: world.history.resourceTransferOutcomes.length,
    },
    governments: [],
    adjustments: [],
    unknown: [],
  };
  const opened: World = {
    ...world,
    publicBudgets: withOpenedBudgets(world, empty, today),
  };
  const dueAt = firstOfNextMonth(today);
  return scheduleFutureDueItem(opened, {
    stableKey: `${PUBLIC_BUDGETS_VERSION}:pass:${dueAt.slice(0, 7)}`,
    dueAt,
    transitionKey: PUBLIC_BUDGETS_TRANSITION_KEY,
    entityIds: [world.id],
    jurisdictionId: null,
    provenance: { kind: "initialization", reference: PUBLIC_BUDGETS_VERSION },
  });
}

/** Settles the month just ended for every government. */
export function settlePublicBudgets(world: World, month: IsoDate): World {
  const store = world.publicBudgets;
  if (!store) return world;
  const { flows, cursor } = readMonthFlows(world, store);
  const adjustments = [...store.adjustments];
  const governments = store.governments.map((government) => {
    const settled = settleGovernmentMonth(world, government, month, flows);
    adjustments.push(...settled.adjustments);
    return settled.government;
  });
  const settled: PublicBudgetStore = {
    ...store,
    cursor,
    governments,
    adjustments,
  };
  return {
    ...world,
    publicBudgets: withOpenedBudgets(world, settled, firstOfNextMonth(month)),
  };
}

export function publicBudgetsHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== PUBLIC_BUDGETS_TRANSITION_KEY) {
    throw new Error("The public-budgets pass received another transition.");
  }
  const dueAt = makeIsoDate(dueItem.dueAt);
  let next = settlePublicBudgets(world, firstOfPreviousMonth(dueAt));
  const following = firstOfNextMonth(dueAt);
  next = scheduleFutureDueItem(next, {
    stableKey: `${PUBLIC_BUDGETS_VERSION}:pass:${following.slice(0, 7)}`,
    dueAt: following,
    transitionKey: PUBLIC_BUDGETS_TRANSITION_KEY,
    entityIds: [next.id],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [next.id] },
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: "public-budgets:settled",
    context: null,
    outcomeEventId: null,
  };
}
