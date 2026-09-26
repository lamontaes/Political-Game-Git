import { beforeAll, describe, expect, it } from "vitest";
import { serializeWorld, worldContentId, type World } from "../simulation";
import { migrationTown } from "../simulation/migration/review";
import { observerAnchorPersonId } from "../simulation/people-continuation";
import {
  createBrowserWorldRecord,
  validateBrowserWorldRecord,
} from "./browser-world-repository";
import {
  playedLifeContinuation,
  shellReadOnly,
  shellViewpointPersonId,
  watchedFromStart,
} from "./life-continuation-shell";
import {
  advanceObservedWorld,
  advanceObservedWorldWeeks,
  observerPeople,
  observerPlace,
  observerSetup,
  openObserverWorld,
  projectObserverPerson,
  projectObserverRecord,
} from "./observer-world";
import {
  applyObserverHistoryCheckpoint,
  observerHistoryCheckpoint,
} from "./observer-history-checkpoint";

/**
 * Observer Mode (Constitution rule 30): one press opens a world with nobody
 * played in it, the same systems run it, and the watcher can read all of it.
 */
describe("a world watched from its start", () => {
  let world: World;
  let anchor: ReturnType<typeof openObserverWorld>["anchorPersonId"];

  beforeAll(() => {
    const opened = openObserverWorld(observerSetup("observer-test-1"));
    world = opened.world;
    anchor = opened.anchorPersonId;
  }, 60_000);

  it("reviews the anchor's town for movers, as it would the player's", () => {
    const home = world.people[anchor]!.homeJurisdictionId;
    expect(home).toBeTruthy();
    expect(world.jurisdictions[home!]?.kind).toBe("census-place");
    expect(migrationTown(world)).toBe(home);
  });

  it("opens with nobody played and says so in its history", () => {
    expect(world.control.kind).toBe("observer");
    expect(observerAnchorPersonId(world)).toBe(anchor);
    expect(watchedFromStart(world)).toBe(true);
    expect(shellReadOnly(world)).toBe(true);
    // The opening resident lives on as an ordinary person, never as a played
    // life, so nobody is offered as that life's continuation.
    expect(world.people[anchor]).toBeDefined();
    expect(playedLifeContinuation(world)).toBeNull();
    expect(shellViewpointPersonId(world)).toBe(anchor);
  });

  it("opens in places across the country, not one default", () => {
    const states = new Set(
      Array.from(
        { length: 12 },
        (_, index) => observerPlace(`spread-${index}`).stateJurisdictionKey,
      ),
    );
    expect(states.size).toBeGreaterThanOrEqual(6);
    expect(observerPlace("same").key).toBe(observerPlace("same").key);
  });

  it("lets time pass on the same clock, and never for a played life", () => {
    const next = advanceObservedWorld(world, 7);
    expect(next.currentDate > world.currentDate).toBe(true);
    expect(next.control.kind).toBe("observer");
    expect(() =>
      advanceObservedWorld(
        { ...world, control: { kind: "person", personId: anchor } },
        7,
      ),
    ).toThrow();
  }, 60_000);

  it("batches weekly actions without changing the resulting world", () => {
    let sequential = world;
    for (let index = 0; index < 4; index += 1) {
      sequential = advanceObservedWorld(sequential, 7);
    }
    const batched = advanceObservedWorldWeeks(world, 4);
    expect(serializeWorld(batched)).toBe(serializeWorld(sequential));
    expect(() => advanceObservedWorldWeeks(world, 0)).toThrow(
      /positive whole weeks/,
    );
  }, 120_000);

  it("rebuilds a quarterly World from appended history without losing older records", () => {
    const advanced = advanceObservedWorldWeeks(world, 4);
    const checkpoint = observerHistoryCheckpoint(world, advanced);
    expect(checkpoint.kind).toBe("append");
    const rebuilt = applyObserverHistoryCheckpoint(world, checkpoint);
    expect(worldContentId(rebuilt)).toBe(worldContentId(advanced));
    expect(() => applyObserverHistoryCheckpoint(advanced, checkpoint)).toThrow(
      /does not follow/,
    );
  }, 120_000);

  it("saves and reopens as a watched world", () => {
    const record = createBrowserWorldRecord(world, "2026-09-22T22:00:00.000Z");
    expect(record.metadata.observing).toBe(true);
    expect(record.metadata.playerPersonId).toBe(anchor);
    expect(() => validateBrowserWorldRecord(record)).not.toThrow();
  });

  it("shows the whole world, not one person's contacts", () => {
    const record = projectObserverRecord(world);
    const living = Object.keys(world.people).length - record.deathCount;
    expect(record.livingCount).toBe(living);
    expect(observerPeople(world, "", 10_000).total).toBe(living);
    expect(record.officeholders.length).toBeGreaterThan(0);
    const file = projectObserverPerson(world, anchor);
    expect(file?.name.length).toBeGreaterThan(0);
    expect(file?.record.length).toBeGreaterThan(0);
  });
});
