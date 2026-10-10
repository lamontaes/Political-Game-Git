import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { passOrdinaryDays } from "../../presentation/ordinary-life";
import { addDays } from "../dates";
import { stableHash } from "../ids";
import {
  openOrdinaryLifeRecords,
  refreshLifeOpportunities,
} from "../life-opportunities";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import { recordHouseholdLocation } from "../life";
import { householdMembershipsAt } from "../life-queries";
import { sceneBindingsFor } from "../scene-bindings";
import type { EntityId, StoryMomentRecord, World } from "../types";
import { deserializeWorld, serializeWorld } from "../serialization";
import { assertWorldIntegrityFully, recordWorldEvent } from "../world";
import { recordStoryMoments, storyMoments, storyMomentsOf } from "./moments";
import {
  scheduleStoryScenes,
  storyCoverage,
  storyPaceOf,
  storyPaceRank,
} from "./scheduling";
import { situationOf, situationCausesFor } from "./situation-binding";
import { situationType, STORY_SCHEDULING } from "./situations";

/** A place drawn from all 56 by the seed's hash: its first locality. */
function placeFor(seed: string) {
  const states = lifePlaceStateIdentities();
  const state =
    states[parseInt(stableHash(seed).slice(0, 8), 16) % states.length]!;
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  })[0]!;
  return { place, state };
}

function newLife(seed: string, startAge: number) {
  const { place } = placeFor(seed);
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge,
    placeKey: place.key,
  });
  return { world: game.world, personId: game.playerPersonId };
}

/** A new game advanced 7 days, with the last day's records read and scheduled. */
function seededWeek(seed: string, startAge: number) {
  const { world, personId } = newLife(seed, startAge);
  const opened = refreshLifeOpportunities(
    openOrdinaryLifeRecords(world, personId),
    personId,
  );
  const passed = passOrdinaryDays(opened, 7);
  return {
    world: scheduleStoryScenes(
      recordStoryMoments(passed),
      passed.history.nextSequence,
    ),
    personId,
  };
}

function situations(world: World, personId: EntityId) {
  return sceneBindingsFor(world, personId, "situation").map(
    (entry) => entry.binding,
  );
}

describe("the pace a life carries", () => {
  it("is data: about 1, 2 and 3 scenes a year through childhood, and 4 as an adult", () => {
    expect(STORY_SCHEDULING.paces).toEqual({
      "early-childhood": 1,
      "middle-childhood": 2,
      adolescence: 3,
      adult: 4,
    });
  });

  it("follows the life's band of childhood agency", () => {
    expect(storyPaceOf(...lifeAt("p6-pace-6", 6))).toBe(1);
    expect(storyPaceOf(...lifeAt("p6-pace-10", 10))).toBe(2);
    expect(storyPaceOf(...lifeAt("p6-pace-15", 15))).toBe(3);
  });
});

function lifeAt(seed: string, age: number): [World, EntityId] {
  const { world, personId } = newLife(seed, age);
  return [world, personId];
}

describe("scheduling in a seeded week", () => {
  // Seed p6-story-c draws Aberdeen Gardens, Washington: Mateo McKenzie, 34.
  const { world, personId: mateo } = seededWeek("p6-story-c", 34);
  const bound = situations(world, mateo);

  it("makes scenes of the two moments of the week that reach him", () => {
    expect(bound.map((binding) => binding.variant).sort()).toEqual([
      "first-meeting",
      "reach-out",
    ]);
    for (const binding of bound) {
      const moment = storyMoments(world).find(
        (entry) => entry.id === situationOf(binding)!.momentId,
      )!;
      expect(moment.occurredAt).toBe("2026-01-12");
      expect(storyPaceRank(world, moment)).toBeLessThanOrEqual(
        storyPaceOf(world, mateo),
      );
    }
  });

  it("stages each scene where the records place it, with everyone in their role", () => {
    const call = bound.find((binding) => binding.variant === "reach-out")!;
    // His sister asks by phone; the call reaches him at home.
    expect(call.staging!.setting).toBe("phone");
    expect(
      call.staging!.people.map((person) => [person.role, person.mood]),
    ).toEqual([
      ["asking", "hopeful"],
      ["asked", "curious"],
    ]);
    const met = bound.find((binding) => binding.variant === "first-meeting")!;
    expect(met.staging!.setting).toBe("public");
    expect(met.staging!.people.map((person) => person.role).sort()).toEqual([
      "introducer",
      "met",
      "newcomer",
    ]);
    for (const binding of bound) {
      const type = situationType(binding.variant);
      for (const person of binding.staging!.people) {
        expect(world.people[person.personId]).toBeDefined();
        const role = type.roles.find((entry) => entry.key === person.role)!;
        expect(person.mood).toBe(role.bearing);
        expect(person.acts).toEqual(role.wants);
      }
    }
  });

  it("opens each scene for as many days as its timing keeps it", () => {
    for (const binding of bound) {
      const type = situationType(binding.variant);
      expect(binding.facts.timing).toBe(type.timing);
      expect(binding.date).toBe(world.currentDate);
      expect(binding.expiresAt).toBe(
        addDays(world.currentDate, STORY_SCHEDULING.openDays[type.timing]!),
      );
    }
  });

  it("leaves his earlier years, read on the first day, to the journal", () => {
    const earlier = storyMomentsOf(world, mateo).filter(
      (moment) =>
        moment.occurredAt < "2026-01-01" &&
        situationCausesFor(moment.kindKey).length > 0,
    );
    // School starts and finishes, a first job: types exist for them all.
    expect(earlier.length).toBeGreaterThan(3);
    const scheduled = new Set(
      bound.map((binding) => situationOf(binding)!.momentId),
    );
    expect(earlier.filter((moment) => scheduled.has(moment.id))).toEqual([]);
  });

  it("logs each moment the library cannot stage, with its reason", () => {
    const rows = storyCoverage(world);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const moment = storyMoments(world).find(
        (entry) => entry.id === row.momentId,
      )!;
      expect(row.kindKey).toBe(moment.kindKey);
      if (row.reason === "no-type")
        expect(situationCausesFor(row.kindKey)).toEqual([]);
      else expect(row.typeKey).not.toBeNull();
    }
    // A household move has no type yet: the log shows the gap.
    expect(rows.some((row) => row.kindKey === "moved-home")).toBe(true);
    assertWorldIntegrityFully(world);
  });

  it("keeps its scenes and its log through a save and reload", () => {
    const reloaded = deserializeWorld(serializeWorld(world));
    expect(storyCoverage(reloaded)).toEqual(storyCoverage(world));
    expect(situations(reloaded, mateo)).toEqual(bound);
  });
});

/**
 * A small world whose household lives at a recorded home, written the way the
 * town's own households are: the place's name, through the location writer.
 */
function smallHome(
  options: Parameters<typeof smallWorld>[0],
): ReturnType<typeof smallWorld> {
  const small = smallWorld({ ...options, household: true });
  const household = small.world.history.households.at(-1)!;
  return {
    ...small,
    world: recordHouseholdLocation(small.world, {
      stableKey: "test:small-world:household:location",
      householdId: household.id,
      effectiveAt: small.world.currentDate,
      jurisdictionId: small.jurisdictionId,
      label: small.place.displayName,
      kind: "residence:home",
      provenance: { kind: "authored", note: "Controlled small-world home." },
      supersedesLocationId: null,
    }),
  };
}

/** Edge-case fixture: moments written straight into the store for one person. */
function withMoments(
  world: World,
  personId: EntityId,
  rows: readonly { readonly other: EntityId; readonly salience: number }[],
): { readonly world: World; readonly from: number } {
  let next = world;
  const eventIds: EntityId[] = [];
  for (const [index, row] of rows.entries()) {
    next = recordWorldEvent(next, {
      stableKey: `p6-pace-fixture:${index}`,
      type: "test.p6-pace-fixture",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: next.people[personId]!.homeJurisdictionId,
      involvedEntityIds: [personId, row.other],
      participants: [
        { personId, role: "focus:subject", detail: null },
        { personId: row.other, role: "presence:participant", detail: null },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [],
      summary: "Fixture.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    eventIds.push(next.history.events.at(-1)!.id);
  }
  const from = next.history.nextSequence;
  const moments = rows.map((row, index): StoryMomentRecord => ({
    id: `story-moment_fixture_${index}` as EntityId,
    stableKey: `reached-out:${personId}:${eventIds[index]}`,
    sequence: from + index,
    personId,
    occurredAt: next.currentDate,
    kindKey: "reached-out",
    counterpartPersonIds: [row.other],
    sourceStore: "events",
    sourceRecordId: eventIds[index]!,
    salience: row.salience,
    factors: {
      kind: row.salience,
      closeness: 1,
      first: 1,
      traits: 1,
      stakes: 1,
    },
    weight: { source: "fixture", row: "Fixture", value: 0 },
  }));
  return {
    world: {
      ...next,
      history: {
        ...next.history,
        nextSequence: from + moments.length,
        storyMoments: [...storyMoments(next), ...moments],
      },
    },
    from,
  };
}

describe("the pace decides which moments become scenes", () => {
  it("makes scenes of the four that matter most to an adult and leaves the fifth to the journal", () => {
    const small = smallHome({
      place: placeFor("p6-pace-fixture").state.jurisdictionKey,
      people: 6,
      seed: "p6-pace-fixture",
    });
    const others = Object.keys(small.world.people).filter(
      (id) => id !== small.personId,
    ) as EntityId[];
    expect(storyPaceOf(small.world, small.personId)).toBe(4);
    const { world, from } = withMoments(
      small.world,
      small.personId,
      [0.5, 0.4, 0.3, 0.2, 0.1].map((salience, index) => ({
        other: others[index]!,
        salience,
      })),
    );
    const scheduled = scheduleStoryScenes(world, from);
    const speakers = situations(scheduled, small.personId).map(
      (binding) => binding.speakerPersonId,
    );
    expect(speakers).toEqual(others.slice(0, 4));
    // The fifth is not a gap in the library, so it is not logged either.
    expect(storyCoverage(scheduled)).toEqual([]);
  });
});

/** The player leaving home, written as the household's own record would be. */
function leaveHome(small: ReturnType<typeof smallWorld>): World {
  return recordWorldEvent(small.world, {
    stableKey: "p6-scheduling:left-home",
    type: "life.left-home",
    occurredAt: small.world.currentDate,
    recordedAt: small.world.currentDate,
    jurisdictionId: small.jurisdictionId,
    involvedEntityIds: [small.personId],
    participants: [
      { personId: small.personId, role: "focus:subject", detail: null },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary: "Fixture: the player leaves home.",
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

describe("one rule in all 56 places", () => {
  it("stages a departure at the household's recorded home, with the people who live there", () => {
    const states = lifePlaceStateIdentities();
    expect(states).toHaveLength(56);
    for (const state of states) {
      const small = smallHome({
        place: state.jurisdictionKey,
        seed: "p6-scheduling",
      });
      const before = small.world.history.nextSequence;
      const world = scheduleStoryScenes(
        recordStoryMoments(leaveHome(small)),
        before,
      );
      const departure = situations(world, small.personId).find(
        (binding) => binding.variant === "departure",
      );
      expect(departure, state.usps).toBeDefined();
      const home = householdMembershipsAt(world, small.personId).find(
        (entry) => entry.location,
      )!.location!;
      expect(departure!.staging!.setting, state.usps).toBe("home");
      expect(departure!.staging!.placeRecordId, state.usps).toBe(home.id);
      expect(departure!.place, state.usps).toBe(home.label);
      expect(departure!.jurisdictionId, state.usps).toBe(home.jurisdictionId);
      // The player leaves; everyone else in the household stays.
      expect(
        departure!.staging!.people.map((person) => [person.role, person.mood]),
        state.usps,
      ).toEqual([
        ["leaving", "tender"],
        ...Object.keys(small.world.people)
          .filter((id) => id !== small.personId)
          .map(() => ["staying", "solemn"]),
      ]);
      assertWorldIntegrityFully(world);
    }
  });

  it("logs a scene the records cannot place, rather than placing it anywhere", () => {
    // Edge case: a household with no location on record.
    const small = smallWorld({
      place: placeFor("p6-no-place").state.jurisdictionKey,
      household: true,
      seed: "p6-scheduling",
    });
    const before = small.world.history.nextSequence;
    const world = scheduleStoryScenes(
      recordStoryMoments(leaveHome(small)),
      before,
    );
    expect(situations(world, small.personId)).toEqual([]);
    expect(
      storyCoverage(world).map((row) => [row.reason, row.typeKey, row.detail]),
    ).toEqual([["no-place", "departure", "departure: no home on record"]]);
  });
});
