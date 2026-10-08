import { describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "./character-history";
import { makeIsoDate } from "./dates";
import * as families from "./family-shape";
import {
  createHousehold,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "./life";
import { upbringingFor } from "./people-upbringing";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, IsoDate, World } from "./types";

/**
 * A day's new people, each in a household of their own, change the people and
 * household tables but not the families already sampled. The family index is
 * then carried forward, and what it reads must be exactly what a build from
 * nothing reads (the same world, reloaded, so no cache can answer for it).
 */
const seed = "family-index-extension";
const place = drawRandomPlace(seed);

const provenance = {
  kind: "authored",
  note: "Family index extension test.",
} as const;

function withNewHousehold(
  world: World,
  jurisdictionId: EntityId,
  key: string,
  people: readonly { stableKey: string; birthDate: IsoDate }[],
): { world: World; personIds: EntityId[] } {
  let next = createCharacterHistoryContextPeople(
    world,
    people.map((person) => ({
      ...person,
      givenName: "Test",
      familyName: key,
      homeJurisdictionId: jurisdictionId,
    })),
  );
  const personIds = people.map((person) =>
    characterHistoryContextPersonId(next, person.stableKey),
  );
  next = createHousehold(next, {
    stableKey: `${key}:household`,
    formedAt: world.currentDate,
    label: key,
    provenance,
  });
  const householdId = next.history.households.at(-1)!.id;
  for (const personId of personIds)
    next = startHouseholdMembership(next, {
      stableKey: `${key}:${personId}:member`,
      personId,
      householdId,
      startedAt: world.currentDate,
      residenceRole: "primary",
      kind: "resident:member",
      provenance,
    });
  next = recordHouseholdLocation(next, {
    stableKey: `${key}:home`,
    householdId,
    effectiveAt: world.currentDate,
    jurisdictionId,
    kind: "residence:home",
    label: place.displayName,
    provenance,
    supersedesLocationId: null,
  });
  return { world: next, personIds };
}

const coldRead = (world: World, personId: EntityId) =>
  upbringingFor(deserializeWorld(serializeWorld(world)), personId);

describe(`family index extension (${place.displayName}, seed ${seed})`, () => {
  it("carries the index over new people in new households and reads what a full build reads", () => {
    const { world, personId, jurisdictionId } = smallWorld({
      place: place.key,
      seed,
      people: 8,
      household: true,
    });
    const spy = vi.spyOn(families, "recordedFamilyEstimates");
    try {
      upbringingFor(world, personId);
      const builds = spy.mock.calls.length;
      expect(builds).toBeGreaterThan(0);

      // Two days' worth of arrivals, one after the other, as the wake adds them.
      const first = withNewHousehold(world, jurisdictionId, "first", [
        { stableKey: "ext:a1", birthDate: makeIsoDate("1980-03-04") },
        { stableKey: "ext:a2", birthDate: makeIsoDate("1983-07-09") },
      ]);
      const second = withNewHousehold(first.world, jurisdictionId, "second", [
        { stableKey: "ext:b1", birthDate: makeIsoDate("1975-11-30") },
      ]);

      // Read through the carried index first, then from nothing.
      const carried = [first, second].flatMap((next) =>
        [personId, ...next.personIds].map(
          (id) => [next.world, id, upbringingFor(next.world, id)] as const,
        ),
      );
      // The carried index never ran the family estimate again.
      expect(spy.mock.calls.length).toBe(builds);
      for (const [next, id, read] of carried)
        expect(read).toEqual(coldRead(next, id));
    } finally {
      spy.mockRestore();
    }
  });

  it("does not rebuild the cohorts for a new household of new people", () => {
    const { world, personId, jurisdictionId } = smallWorld({
      place: place.key,
      seed: `${seed}-count`,
      people: 8,
      household: true,
    });
    const spy = vi.spyOn(families, "recordedFamilyEstimates");
    try {
      upbringingFor(world, personId);
      const builds = spy.mock.calls.length;
      const next = withNewHousehold(world, jurisdictionId, "count", [
        { stableKey: "count:a1", birthDate: makeIsoDate("1982-02-02") },
      ]);
      upbringingFor(next.world, personId);
      upbringingFor(next.world, next.personIds[0]!);
      expect(spy.mock.calls.length).toBe(builds);
    } finally {
      spy.mockRestore();
    }
  });

  it("rebuilds when a new person joins a household that already existed", () => {
    const { world, personId, jurisdictionId } = smallWorld({
      place: place.key,
      seed: `${seed}-join`,
      people: 8,
      household: true,
    });
    const spy = vi.spyOn(families, "recordedFamilyEstimates");
    try {
      upbringingFor(world, personId);
      const builds = spy.mock.calls.length;
      // Put the new person into the existing household instead.
      let next = createCharacterHistoryContextPeople(world, [
        {
          stableKey: "join:b1",
          givenName: "Test",
          familyName: "Join",
          birthDate: makeIsoDate("1990-05-05"),
          homeJurisdictionId: jurisdictionId,
        },
      ]);
      const joinerId = characterHistoryContextPersonId(next, "join:b1");
      next = startHouseholdMembership(next, {
        stableKey: "join:b1:member",
        personId: joinerId,
        householdId: next.history.households[0]!.id,
        startedAt: world.currentDate,
        residenceRole: "primary",
        kind: "resident:member",
        provenance,
      });
      expect(upbringingFor(next, personId)).toEqual(coldRead(next, personId));
      expect(spy.mock.calls.length).toBeGreaterThan(builds);
    } finally {
      spy.mockRestore();
    }
  });

  it("rebuilds when an earlier person was edited between the index and the new arrivals", () => {
    const { world, personId, jurisdictionId } = smallWorld({
      place: place.key,
      seed: `${seed}-edit`,
      people: 8,
      household: true,
    });
    const spy = vi.spyOn(families, "recordedFamilyEstimates");
    try {
      upbringingFor(world, personId);
      const builds = spy.mock.calls.length;
      // A person table changed outside any append writer: the same ids, but
      // one person is now a different object, so nothing earlier may be assumed.
      const source = world.people[personId]!;
      const edited: World = {
        ...world,
        people: {
          ...world.people,
          [personId]: { ...source },
        },
      };
      const next = withNewHousehold(edited, jurisdictionId, "edit", [
        { stableKey: "edit:a1", birthDate: makeIsoDate("1981-01-01") },
      ]);
      for (const id of [personId, ...next.personIds])
        expect(upbringingFor(next.world, id)).toEqual(coldRead(next.world, id));
      expect(spy.mock.calls.length).toBeGreaterThan(builds);
    } finally {
      spy.mockRestore();
    }
  });
});
