import { describe, expect, it } from "vitest";

import { addDays, makeIsoDate } from "./dates";
import {
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
  setDeepTransitionInputGuard,
} from "./future-transitions";
import { requireLifePlace } from "./life-places";
import { advanceWorldMinutes } from "./time-work";
import type { EntityId, FutureTransitionHandlerRegistry, World } from "./types";
import {
  advanceWorld,
  assertWorldIntegrity,
  createWorld,
  recordWorldEvent,
  withWorldIntegrityDeferred,
} from "./world";

/**
 * Writers inside a scheduled transition no longer re-check the whole World
 * after every write; the resolver checks the result once. These prove the
 * deferral moves the check and never removes it.
 */

function base(): World {
  return createWorld({
    seed: "integrity-deferred",
    currentDate: makeIsoDate("2031-06-01"),
    jurisdictions: [requireLifePlace("kentucky").context.jurisdiction],
    people: [],
  });
}

/** A World whose newest event names an entity that does not exist. */
function broken(world: World): World {
  const valid = recordWorldEvent(world, {
    stableKey: "integrity-deferred:event",
    type: "test.integrity-deferred",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.jurisdictionOrder[0]!,
    involvedEntityIds: [world.jurisdictionOrder[0]!],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [],
    summary: "An event for the deferred-integrity test.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const events = valid.history.events;
  const last = events.at(-1)!;
  return {
    ...valid,
    history: {
      ...valid.history,
      events: [
        ...events.slice(0, -1),
        // Deliberately forged: an id no entity in this World carries.
        { ...last, involvedEntityIds: ["person_doesnotexist0000" as EntityId] },
      ],
    },
  };
}

describe("deferred world integrity", () => {
  it("skips the check only inside the deferred scope", () => {
    const bad = broken(base());
    expect(() =>
      withWorldIntegrityDeferred(() => assertWorldIntegrity(bad)),
    ).not.toThrow();
    expect(() => assertWorldIntegrity(bad)).toThrow(/missing involved entity/);
  });

  it("still refuses a transition whose handler returns an invalid World", () => {
    const world = scheduled();
    const registry = createFutureTransitionHandlerRegistry([
      [
        "test:integrity-deferred",
        (current) => ({
          world: broken(current),
          status: "resolved",
          reasonKey: null,
          context: null,
          outcomeEventId: null,
        }),
      ],
    ]);
    expect(() => advanceWorld(world, 2, registry)).toThrow(
      /missing involved entity/,
    );
  });

  it("refuses a whole clock advance that produced an invalid World", () => {
    expect(() =>
      advanceWorldMinutes(scheduled(), 2 * 24 * 60, brokenRegistry()),
    ).toThrow(/missing involved entity/);
  });

  it("still refuses a handler that pushes onto its input with the deep guard off", () => {
    const registry = createFutureTransitionHandlerRegistry([
      [
        "test:integrity-deferred",
        (current) => {
          (current.history.events as unknown as unknown[]).push(
            current.history.events.at(-1),
          );
          return {
            world: current,
            status: "resolved",
            reasonKey: null,
            context: null,
            outcomeEventId: null,
          };
        },
      ],
    ]);
    setDeepTransitionInputGuard(false);
    try {
      expect(() =>
        advanceWorldMinutes(withEvent(scheduled()), 2 * 24 * 60, registry),
      ).toThrow(/mutated its input world/);
    } finally {
      setDeepTransitionInputGuard(true);
    }
  });
});

function withEvent(world: World): World {
  return recordWorldEvent(world, {
    stableKey: "integrity-deferred:seed-event",
    type: "test.integrity-deferred",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.jurisdictionOrder[0]!,
    involvedEntityIds: [world.jurisdictionOrder[0]!],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [],
    summary: "An event for the input-guard test.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

function brokenRegistry(): FutureTransitionHandlerRegistry {
  return createFutureTransitionHandlerRegistry([
    [
      "test:integrity-deferred",
      (current) => ({
        world: broken(current),
        status: "resolved",
        reasonKey: null,
        context: null,
        outcomeEventId: null,
      }),
    ],
  ]);
}

function scheduled(): World {
  return scheduleFutureDueItem(base(), {
    stableKey: "integrity-deferred:due",
    dueAt: addDays(makeIsoDate("2031-06-01"), 1),
    transitionKey: "test:integrity-deferred",
    entityIds: [base().jurisdictionOrder[0]!],
    jurisdictionId: null,
    provenance: { kind: "authored", note: "Deferred-integrity test." },
  });
}
