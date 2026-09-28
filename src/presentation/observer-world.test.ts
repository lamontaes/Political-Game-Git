import { beforeAll, describe, expect, it } from "vitest";
import type { World } from "../simulation";
import { migrationTown } from "../simulation/migration/review";
import { observerAnchorPersonId } from "../simulation/people-continuation";
import { stateCandidacyPack } from "../simulation/candidacy-packs";
import { stateJurisdictionForKey } from "../simulation/life-places";
import { recordWorldEvent } from "../simulation/world";
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
  observerPeople,
  observerPlace,
  observerSetup,
  openObserverWorld,
  projectObserverPerson,
  projectObserverRecord,
} from "./observer-world";

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

  it("reads saved congressional and state legislative results without making elections", () => {
    const [houseWinner, senateWinner] = world.personOrder;
    const pack = stateCandidacyPack("US-KS")!;
    const stateId = stateJurisdictionForKey("US-KS")!.id;
    const context = {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    };
    const congress = recordWorldEvent(world, {
      stableKey: "test:observer:congress-results",
      type: "election.congress-general-results",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [houseWinner!, senateWinner!],
      participants: [
        {
          personId: houseWinner!,
          role: "focus:winner",
          detail: "us-house:KS-01|democratic|democratic|new|2027-01-03",
        },
        {
          personId: senateWinner!,
          role: "focus:winner",
          detail: "us-senate:KS:class-2|republican|republican|new|2027-01-03",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["congress-turnover/v1"],
      summary: "Voters chose two members of Congress.",
      context,
    });
    const state = recordWorldEvent(congress, {
      stableKey: "test:observer:state-results",
      type: "election.state-legislative-general-results",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: stateId,
      involvedEntityIds: [stateId, houseWinner!],
      participants: [
        {
          personId: houseWinner!,
          role: "focus:winner",
          detail: `${pack.offices[0]!.officeKey}|1|democratic|new||2027-01-01`,
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [`pack:${pack.packId}`, "campaign-seat:another-seat"],
      summary: "Voters chose members of the Kansas Legislature.",
      context,
    });

    const original = world.history.events.length;
    const rows = projectObserverRecord(state).electionSummaries;
    expect(world.history.events).toHaveLength(original);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      body: pack.displayName,
      place: "Kansas",
      seatCount: 2,
      winnerCount: 1,
      separateContestCount: 1,
      offices: [{ key: pack.offices[0]!.officeKey, winnerCount: 1 }],
    });
    expect(rows[1]).toMatchObject({
      body: "Congress",
      seatCount: 2,
      winnerCount: 2,
      separateContestCount: 0,
      offices: [
        { key: "us-house", winnerCount: 1 },
        { key: "us-senate", winnerCount: 1 },
      ],
    });
    expect(rows[1]!.winners.map((winner) => winner.personId)).toEqual([
      houseWinner,
      senateWinner,
    ]);
  });
});
