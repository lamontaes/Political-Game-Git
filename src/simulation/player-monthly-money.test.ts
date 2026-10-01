import { describe, expect, it } from "vitest";
import { createDemoWorld } from "./demo";
import { advanceWorld } from "./world";
import { composeWorldTimeHandlers } from "./campaigns";
import { daysBetween } from "./dates";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "./future-transitions";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  ensurePlayerMonthlyMoneySchedule,
  PLAYER_MONTHLY_MONEY_KEY,
} from "./player-monthly-money";
import type { World } from "./types";

function fixture() {
  const bare = createDemoWorld("c9-control-return", { peopleCount: 1 });
  const personId = bare.personOrder[0]!;
  const controlled: World = { ...bare, control: { kind: "person", personId } };
  return {
    personId,
    world: ensurePlayerMonthlyMoneySchedule(controlled, personId),
  };
}

describe("monthly money schedule recovery", () => {
  it("restores a future first-of-month review after control leaves and returns", () => {
    const { personId, world } = fixture();
    const due = world.history.futureDueItems.find(
      (item) => item.transitionKey === PLAYER_MONTHLY_MONEY_KEY,
    )!;
    const away: World = { ...world, control: { kind: "observer" } };
    const passed = advanceWorld(
      away,
      daysBetween(world.currentDate, due.dueAt),
      composeWorldTimeHandlers(),
    );
    expect(
      futureDueItemStateAt(passed, due.id, {
        asOfDate: passed.currentDate,
        historySequenceExclusive: passed.history.nextSequence,
      })?.status,
    ).toBe("resolved");
    expect(passed.history.resourceTransferOutcomes).toEqual(
      world.history.resourceTransferOutcomes,
    );
    const back: World = { ...passed, control: { kind: "person", personId } };
    const restored = ensurePlayerMonthlyMoneySchedule(back, personId);
    const added = restored.history.futureDueItems.slice(
      passed.history.futureDueItems.length,
    );
    expect(added).toHaveLength(1);
    expect(added[0]!.dueAt > restored.currentDate).toBe(true);
    expect(added[0]!.dueAt.endsWith("-01")).toBe(true);
    expect(ensurePlayerMonthlyMoneySchedule(restored, personId)).toBe(restored);
    const loaded = deserializeWorld(serializeWorld(restored));
    expect(
      serializeWorld(ensurePlayerMonthlyMoneySchedule(loaded, personId)),
    ).toBe(serializeWorld(loaded));
  });

  it("replaces a cancelled future review without changing its first-of-month date", () => {
    const { personId, world } = fixture();
    const due = world.history.futureDueItems.find(
      (item) => item.transitionKey === PLAYER_MONTHLY_MONEY_KEY,
    )!;
    const cancelled = cancelFutureDueItem(world, {
      stableKey: "c9:cancel-review",
      dueItemId: due.id,
      effectiveAt: world.currentDate,
      reasonKey: "player-monthly-money:cancelled",
      context: null,
    });
    const restored = ensurePlayerMonthlyMoneySchedule(cancelled, personId);
    const added = restored.history.futureDueItems.slice(
      cancelled.history.futureDueItems.length,
    );
    expect(added).toHaveLength(1);
    expect(added[0]!.dueAt).toBe(due.dueAt);
    expect(added[0]!.id).not.toBe(due.id);
    expect(ensurePlayerMonthlyMoneySchedule(restored, personId)).toBe(restored);
  });
});
