import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { makeIsoDate } from "./dates";
import {
  lifePlaceStateIdentities,
  requireLifePlace,
  stateJurisdictionForKey,
} from "./life-places";
import type { World } from "./types";
import {
  advanceWithWorldIntegrityAtEnd,
  assertWorldIntegrity,
  createWorld,
  recordWorldEvent,
} from "./world";
import {
  changedHistoryCheckCounts,
  setWorldIntegrityCheckMode,
  worldIntegrityCheckMode,
} from "./world-integrity-changed";
import type { WorldIntegrityCheckMode } from "./world-integrity-changed";

/**
 * During play a clock result checks only the records it added. These prove
 * the play check accepts an ordinary result, and that a result it cannot
 * vouch for is still refused by the full check.
 */

function base(): World {
  const world = createWorld({
    seed: "integrity-changed",
    currentDate: makeIsoDate("2031-06-01"),
    jurisdictions: [requireLifePlace("kentucky").context.jurisdiction],
    people: [],
  });
  assertWorldIntegrity(world);
  return world;
}

function withEvent(world: World, key: string): World {
  return recordWorldEvent(world, {
    stableKey: `integrity-changed:${key}`,
    type: "test.integrity-changed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.jurisdictionOrder[0]!,
    involvedEntityIds: [world.jurisdictionOrder[0]!],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [],
    summary: "An event for the changed-only integrity test.",
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

describe("changed-only world integrity", () => {
  let previousMode: WorldIntegrityCheckMode;
  beforeEach(() => {
    previousMode = setWorldIntegrityCheckMode("changed");
  });
  afterEach(() => {
    setWorldIntegrityCheckMode(previousMode);
  });

  it("vouches for a result that only appended valid records", () => {
    const world = base();
    const before = changedHistoryCheckCounts.passed;
    const next = advanceWithWorldIntegrityAtEnd(
      () => withEvent(withEvent(world, "one"), "two"),
      world,
    );
    expect(next.history.events).toHaveLength(2);
    expect(changedHistoryCheckCounts.passed).toBe(before + 1);
    // The index moves forward: the next result is checked from it too.
    const after = advanceWithWorldIntegrityAtEnd(
      () => withEvent(next, "three"),
      next,
    );
    expect(after.history.events).toHaveLength(3);
    expect(changedHistoryCheckCounts.passed).toBe(before + 2);
  });

  it("falls back to the full check for a duplicated id, which refuses it", () => {
    const world = base();
    const fellBack = changedHistoryCheckCounts.fellBack;
    expect(() =>
      advanceWithWorldIntegrityAtEnd(() => {
        const one = withEvent(world, "one");
        const two = withEvent(one, "two");
        const events = two.history.events;
        return {
          ...two,
          history: {
            ...two.history,
            // Forged: the second new event reuses the first one's id.
            events: [events[0]!, { ...events[1]!, id: events[0]!.id }],
          },
        };
      }, world),
    ).toThrow();
    expect(changedHistoryCheckCounts.fellBack).toBe(fellBack + 1);
  });

  it("falls back to the full check for a duplicated stable key", () => {
    const world = base();
    const fellBack = changedHistoryCheckCounts.fellBack;
    const one = advanceWithWorldIntegrityAtEnd(
      () => withEvent(world, "one"),
      world,
    );
    expect(() =>
      advanceWithWorldIntegrityAtEnd(() => {
        const two = withEvent(one, "two");
        const events = two.history.events;
        return {
          ...two,
          history: {
            ...two.history,
            events: [
              ...events.slice(0, -1),
              { ...events.at(-1)!, stableKey: events[0]!.stableKey },
            ],
          },
        };
      }, one),
    ).toThrow();
    expect(changedHistoryCheckCounts.fellBack).toBe(fellBack + 1);
  });

  it("checks changed records through one path across all 56 jurisdiction identities", () => {
    const identities = lifePlaceStateIdentities();
    expect(identities).toHaveLength(56);
    const jurisdictions = identities.map((identity) => {
      const jurisdiction = stateJurisdictionForKey(identity.jurisdictionKey);
      expect(jurisdiction).not.toBeNull();
      return jurisdiction!;
    });
    const world = createWorld({
      seed: "integrity-all-jurisdictions",
      currentDate: makeIsoDate("2031-06-01"),
      jurisdictions,
      people: [],
    });
    const passed = changedHistoryCheckCounts.passed;
    let next = world;
    for (const jurisdiction of jurisdictions) {
      next = recordWorldEvent(next, {
        stableKey: `integrity-all-jurisdictions:${jurisdiction.id}`,
        type: "test.integrity-changed",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: jurisdiction.id,
        involvedEntityIds: [jurisdiction.id],
        participants: [],
        personFactConstraints: [],
        visibility: "public",
        tags: [],
        summary: "A record for the changed-only integrity test.",
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
    expect(advanceWithWorldIntegrityAtEnd(() => next, world)).toBe(next);
    expect(next.history.events).toHaveLength(56);
    expect(changedHistoryCheckCounts.passed).toBe(passed + 1);
  });

  it("uses the full check only when a test explicitly requests it", () => {
    setWorldIntegrityCheckMode("full");
    expect(worldIntegrityCheckMode()).toBe("full");
  });
});

it("defaults to changed-only integrity checks in the test process", () => {
  expect(worldIntegrityCheckMode()).toBe("changed");
});
