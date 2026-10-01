import { describe, expect, it, vi } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { addDays } from "./dates";
import { currentLifeCutoff } from "./life-queries";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
  resolveFutureDueItemsThrough,
} from "./future-transitions";
import { composeWorldTimeHandlers } from "./campaigns";
import * as prosecution from "./justice/prosecution";
import { PROSECUTION_STAGE_TRANSITION_KEY } from "./justice/prosecution-transitions";
import { deserializeWorld, serializeWorld } from "./serialization";

describe("prosecution stages in the complete due-handler composer", () => {
  it("dispatches the actual saved case on its due date, schedules its next stage and survives reload and repeat", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "c7-prosecution-composition",
        placeKey: "3502000",
        startAge: 40,
        questionnaire: "skipped",
      }),
    ).game!;
    let world = game.world;
    // Retain every unrelated record while isolating this adapter's clock proof.
    for (const item of world.history.futureDueItems) {
      if (
        futureDueItemStateAt(world, item.id, currentLifeCutoff(world))
          ?.status !== "scheduled"
      )
        continue;
      world = cancelFutureDueItem(world, {
        stableKey: `c7-court-fixture:${item.id}`,
        dueItemId: item.id,
        effectiveAt: world.currentDate,
        reasonKey: "fixture:isolated-court-composition",
        context:
          "This controlled proof isolates the saved case while using the full handler composer.",
      });
    }
    const referred = prosecution.referForProsecution(world, {
      stableKey: "c7-composed-case",
      subjectPersonId: game.playerPersonId,
      jurisdictionId: world.people[game.playerPersonId]!.homeJurisdictionId,
      offenseKey: "crime:robbery",
      evidence: "documentary",
      standingFindings: 6,
      basisEventIds: [],
      referredBy: { kind: "police", label: "police", personId: null },
    });
    const due = referred.world.history.futureDueItems.find(
      (item) => item.transitionKey === PROSECUTION_STAGE_TRANSITION_KEY,
    )!;
    expect(due).toBeDefined();
    expect(due.entityIds).toEqual([game.playerPersonId]);
    const spy = vi.spyOn(prosecution, "advanceProsecutions");
    try {
      const registry = composeWorldTimeHandlers();
      const loaded = deserializeWorld(serializeWorld(referred.world));
      const before = resolveFutureDueItemsThrough(
        loaded,
        addDays(due.dueAt, -1),
        registry,
      );
      expect(
        spy.mock.calls.filter(
          (call: Parameters<typeof prosecution.advanceProsecutions>) =>
            call[1] === referred.referralId,
        ),
      ).toHaveLength(0);
      const charged = resolveFutureDueItemsThrough(before, due.dueAt, registry);
      expect(
        spy.mock.calls.filter(
          (call: Parameters<typeof prosecution.advanceProsecutions>) =>
            call[1] === referred.referralId,
        ),
      ).toHaveLength(1);
      const charges = charged.history.events.filter(
        (event) =>
          event.type === prosecution.PROSECUTION_CHARGED_EVENT &&
          event.involvedEntityIds.includes(game.playerPersonId),
      );
      expect(charges).toHaveLength(1);
      expect(charges[0]!.occurredAt).toBe(due.dueAt);
      expect(
        futureDueItemStateAt(charged, due.id, currentLifeCutoff(charged))
          ?.status,
      ).toBe("resolved");
      expect(
        charged.history.futureDueItems.some(
          (item) =>
            item.transitionKey === PROSECUTION_STAGE_TRANSITION_KEY &&
            item.dueAt > due.dueAt &&
            item.entityIds.includes(game.playerPersonId),
        ),
      ).toBe(true);
      const repeated = resolveFutureDueItemsThrough(
        deserializeWorld(serializeWorld(charged)),
        due.dueAt,
        registry,
      );
      expect(repeated.history.events).toEqual(charged.history.events);
      expect(
        spy.mock.calls.filter(
          (call: Parameters<typeof prosecution.advanceProsecutions>) =>
            call[1] === referred.referralId,
        ),
      ).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  }, 30_000);
});
