import { describe, expect, it } from "vitest";
import kindsData from "../../../data/content/story-moment-kinds.json" with { type: "json" };
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { passOrdinaryDays } from "../../presentation/ordinary-life";
import { stableHash } from "../ids";
import {
  openOrdinaryLifeRecords,
  refreshLifeOpportunities,
} from "../life-opportunities";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import { ACT_KINDS } from "../traits/act-pulls";
import type { EntityId, World } from "../types";
import { assertWorldIntegrityFully } from "../world";
import {
  recordStoryMoments,
  STORY_MOMENT_KINDS,
  storyIntakeCursor,
  storyMoments,
  storyMomentsOf,
} from "./moments";

/** A new game in a place drawn from all 56 by the seed's hash, advanced 7 days. */
function seededWeek(seed: string, startAge: number) {
  const states = lifePlaceStateIdentities();
  const state =
    states[parseInt(stableHash(seed).slice(0, 8), 16) % states.length]!;
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  })[0]!;
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge,
    placeKey: place.key,
  });
  const personId = game.playerPersonId;
  const opened = refreshLifeOpportunities(
    openOrdinaryLifeRecords(game.world, personId),
    personId,
  );
  // The clock reads each day's records as it advances; the records written
  // after the last advance (the day's closing producers) are read by the next
  // one, so the test takes that next reading itself.
  return {
    world: recordStoryMoments(passOrdinaryDays(opened, 7)),
    personId,
    place: `${place.displayName}, US-${state.usps}`,
  };
}

/** Every record any history store holds that names this person. */
function recordsNaming(world: World, personId: EntityId): number {
  const history = world.history as unknown as Record<string, unknown>;
  let count = 0;
  for (const [store, records] of Object.entries(history)) {
    if (!Array.isArray(records)) continue;
    if (store === "storyMoments" || store === "storyIntakeMarks") continue;
    for (const record of records)
      if (JSON.stringify(record).includes(personId)) count += 1;
  }
  return count;
}

describe("the story moment table", () => {
  it("names only act kinds on the closed list and a source for every weight", () => {
    const sources = new Set(Object.keys(kindsData.sources));
    for (const kind of STORY_MOMENT_KINDS) {
      for (const act of kind.acts) expect(ACT_KINDS.has(act)).toBe(true);
      const rows = [
        kind.adult,
        kind.youth,
        kind.kin,
        ...(kind.relations ?? []).flatMap((row) => [
          row.adult,
          row.youth,
          row.youthLong,
        ]),
        ...(kind.subjectRelations ?? []).flatMap((row) => [
          row.adult,
          row.youth,
        ]),
        ...Object.values(kind.byRelation ?? {}).flatMap((row) => [
          row.adult,
          row.youth,
        ]),
      ].filter((row) => row !== undefined);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(sources.has(row.source)).toBe(true);
        expect(row.row.trim()).not.toBe("");
        expect(row.value).toBeGreaterThan(0);
        expect(row.value).toBeLessThanOrEqual(100);
      }
    }
  });

  it("is one rule for all 56 places: no place is named in the table", () => {
    const states = lifePlaceStateIdentities();
    expect(states).toHaveLength(56);
    const text = JSON.stringify(kindsData).toLowerCase();
    for (const state of states) {
      const place = searchLifePlaces("", 1, {
        stateJurisdictionKey: state.jurisdictionKey,
        scope: "locality",
      })[0]!;
      expect(text).not.toContain(`"${state.usps.toLowerCase()}"`);
      expect(text).not.toContain(place.displayName.toLowerCase());
    }
  });
});

describe("story moments in a seeded week", () => {
  // Seed p6-story-c draws Aberdeen Gardens, Washington: Mateo McKenzie, 34.
  const { world, personId, place } = seededWeek("p6-story-c", 34);

  it("draws its place from the seed", () => {
    expect(place).toBe("Aberdeen Gardens, Washington, US-WA");
  });

  it("scores most records naming the person at zero", () => {
    const moments = storyMomentsOf(world, personId);
    const naming = recordsNaming(world, personId);
    expect(moments.length).toBeGreaterThan(0);
    expect(moments.length * 2).toBeLessThan(naming);
  });

  it("reproduces the worked rows of the design", () => {
    const rows = storyMomentsOf(world, personId).map((moment) => [
      moment.occurredAt,
      moment.kindKey,
      Math.round(moment.salience * 1000) / 1000,
    ]);
    expect(rows).toEqual([
      ["1996-05-12", "school-started", 0.39],
      ["1997-05-12", "moved-home", 0.3],
      ["2001-05-12", "relationship:experience:shared-school:formed", 0.233],
      ["2002-05-12", "school-started", 0.26],
      ["2003-05-12", "relationship:mentorship:guidance:formed", 0.233],
      ["2005-05-12", "school-finished", 0.39],
      ["2005-05-12", "school-started", 0.26],
      ["2005-05-12", "group-joined", 0.27],
      ["2007-05-12", "job-started", 0.3],
      ["2008-05-12", "next-step", 0.63],
      ["2009-05-12", "school-finished", 0.26],
      ["2026-01-12", "relationship:contact:introduced:maintained", 0.117],
      ["2026-01-12", "reached-out", 0.225],
    ]);
  });

  it("cites the scale row behind every weight and keeps salience in range", () => {
    for (const moment of storyMoments(world)) {
      expect(moment.salience).toBeGreaterThan(0);
      expect(moment.salience).toBeLessThanOrEqual(1);
      expect(moment.weight.row.trim()).not.toBe("");
      expect(Object.keys(kindsData.sources)).toContain(moment.weight.source);
    }
  });

  it("scores a minor contact at zero and raises a first friendship over a later one", () => {
    const kinds = storyMoments(world).map((moment) => moment.kindKey);
    expect(kinds.some((kind) => kind.includes("neighbourhood"))).toBe(false);
    const friendships = storyMoments(world).filter(
      (moment) => moment.kindKey === "relationship:contact:friendship:formed",
    );
    expect(friendships.length).toBeGreaterThan(0);
    for (const moment of friendships) {
      expect(moment.factors.kind).toBe(0.155556);
      expect([1, 1.5]).toContain(moment.factors.first);
    }
    // Twenty of these adults made their first recorded friendship that week;
    // a first is raised, a later one is not.
    expect(friendships.some((moment) => moment.factors.first === 1.5)).toBe(
      true,
    );
    expect(friendships.some((moment) => moment.factors.first === 1)).toBe(true);
  });

  it("reads each record once: a second intake writes nothing", () => {
    expect(storyIntakeCursor(world)).toBe(world.history.nextSequence);
    expect(recordStoryMoments(world)).toBe(world);
  });

  it("passes the full World check", () => {
    expect(() => assertWorldIntegrityFully(world)).not.toThrow();
  });
});

describe("story moments in a child's seeded week", () => {
  // Seed p6-story-a draws Acorn, Arkansas: Quinn Vazquez, 10.
  const { world, personId, place } = seededWeek("p6-story-a", 10);

  it("scores the start of school and nothing from the parents' week", () => {
    expect(place).toBe("Acorn, Arkansas, US-AR");
    expect(
      storyMomentsOf(world, personId).map((moment) => [
        moment.occurredAt,
        moment.kindKey,
        moment.salience,
      ]),
    ).toEqual([["2020-08-24", "school-started", 0.39]]);
  });
});
