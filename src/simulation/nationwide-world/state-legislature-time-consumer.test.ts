import { beforeAll, describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import {
  addDays,
  simulationMomentOnLocalDate,
  simulationMinutesBetween,
} from "../dates";
import {
  futureDueItemStateAt,
  resolveFutureDueItemsThrough,
} from "../future-transitions";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import { composeWorldTimeHandlers } from "../campaigns";
import { advanceWorldMinutes } from "../time-work";
import {
  prepareStateLegislatureQueue,
  readStateLegislatureSavedWake,
  STATE_LEGISLATURE_WAKE_TRANSITION,
} from "./state-legislature-queue";

const seed = "session1-state-legislature-clock-consumer";
const place = drawRandomPlace(seed);
let original: World;

function atDate(world: World, date: IsoDate): World {
  const target = simulationMomentOnLocalDate(world.currentMoment, date);
  const minutes = simulationMinutesBetween(world.currentMoment, target);
  return advanceWorldMinutes(world, minutes);
}

function state(world: World, dueItemId: EntityId) {
  return futureDueItemStateAt(world, dueItemId, {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  })?.status;
}

function queueItems(world: World) {
  return world.history.futureDueItems.filter(
    (item) => item.transitionKey === STATE_LEGISLATURE_WAKE_TRANSITION,
  );
}

function appendRelevantSource(world: World): World {
  const opening = world.history.events.find(
    (event) => event.type === "world.state-legislature-opening",
  )!;
  return recordWorldEvent(world, {
    ...opening,
    stableKey: `fixture:clock-queue-source:${world.history.nextSequence}`,
    type: "test.queue-source",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    tags: [],
    summary: "Recorded source change for the state queue clock test.",
  });
}

beforeAll(() => {
  const fixture = smallWorld({
    place: place.key,
    date: "2021-01-01",
    offices: ["state-legislature"],
    seed,
  });
  original = fixture.world;
});

describe("state legislature queue through the canonical clock", () => {
  it("waits until the saved date, then matches canonical due resolution after reload", () => {
    const opened = prepareStateLegislatureQueue(
      original,
      addDays(original.currentDate, -1),
      2025,
    );
    const first = queueItems(opened)
      .filter((item) => state(opened, item.id) === "scheduled")
      .sort((left, right) => left.dueAt.localeCompare(right.dueAt))[0]!;
    const wake = readStateLegislatureSavedWake(first);
    const loaded = deserializeWorld(serializeWorld(opened));
    const beforeDue = atDate(loaded, addDays(wake.dueAt, -1));

    expect(beforeDue.currentDate).toBe(addDays(wake.dueAt, -1));
    expect(state(beforeDue, first.id)).toBe("scheduled");

    const byClock = atDate(beforeDue, wake.dueAt);
    const byRegistry = resolveFutureDueItemsThrough(
      beforeDue,
      wake.dueAt,
      composeWorldTimeHandlers(),
    );
    const queueIds = new Set(queueItems(byClock).map((item) => item.id));
    expect(byClock.currentDate).toBe(wake.dueAt);
    expect(state(byClock, first.id)).toBe("resolved");
    expect(
      byClock.history.futureDueItemStates.filter((entry) =>
        queueIds.has(entry.dueItemId),
      ),
    ).toEqual(
      byRegistry.history.futureDueItemStates.filter((entry) =>
        queueIds.has(entry.dueItemId),
      ),
    );
  });

  it("reconciles a changed source before the next date advance", () => {
    const opened = prepareStateLegislatureQueue(
      original,
      addDays(original.currentDate, -1),
      2025,
    );
    const old = queueItems(opened).find(
      (item) => state(opened, item.id) === "scheduled",
    )!;
    const changed = appendRelevantSource(opened);
    const nextDay = atDate(changed, addDays(changed.currentDate, 1));

    expect(state(nextDay, old.id)).toBe("cancelled");
    expect(
      queueItems(nextDay).some(
        (item) => item.id !== old.id && state(nextDay, item.id) === "scheduled",
      ),
    ).toBe(true);
  });
});
