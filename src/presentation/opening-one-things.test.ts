import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { lawExposuresOf } from "../simulation/law-exposure";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { recordStoryMoments } from "../simulation/story/moments";
import { storyThreadsOf } from "../simulation/story/threads";
import type { World } from "../simulation/types";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  OPENING_STOPS,
  openingOneThings,
  type OpeningOneThing,
  type OpeningStopThing,
} from "./opening-one-things";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";

/**
 * The one thing per stop of the owner's opening redesign (October 8, 2026):
 * for each stop, the record that ties it closest to this life, with its
 * sources, or the reason nothing does.
 */

function newLife(seed: string) {
  const place = drawRandomPlace(seed, (entry) => entry.scope === "locality");
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 34,
      placeKey: place.key,
    }),
  ).game!;
  return {
    world: recordStoryMoments(game.world),
    personId: game.playerPersonId,
    place: place.displayName,
  };
}

function thing(
  things: readonly OpeningStopThing[],
  stop: OpeningStopThing["stop"],
): OpeningOneThing {
  const found = things.find((entry) => entry.stop === stop)!;
  expect(
    found.kind,
    `${stop}: ${"reason" in found ? found.reason : ""}`,
  ).not.toBe("none");
  return found as OpeningOneThing;
}

describe("the one thing per opening stop, in a new life", () => {
  // Seed p6-open-a draws Fertile, Iowa.
  const { world, personId, place } = newLife("p6-open-a");
  const things = openingOneThings(world, personId);

  it("gives the six stops in order, from the country down to the player", () => {
    expect(place).toBe("Fertile, Iowa");
    expect(things.map((entry) => entry.stop)).toEqual([...OPENING_STOPS]);
  });

  it("ties the country to the federal law that reached the player's own life", () => {
    const country = thing(things, "country");
    expect(country.kind).toBe("law-reached-you");
    expect(country.facts.measureId).toMatch(/^starting-law:US:/);
    expect(country.facts.relation).toBe("own");
    const exposure = lawExposuresOf(world, personId).find(
      (row) => row.id === country.sourceRecordIds[0],
    );
    expect(exposure?.measureId).toBe(country.facts.measureId);
    expect(country.people.map((person) => person.role)).toEqual([
      "us-president",
      "us-vice-president",
    ]);
  });

  it("names the player's own district seat first among the members of Congress", () => {
    const representatives = thing(things, "representatives");
    expect(representatives.kind).toBe("represents-you");
    expect(representatives.facts.office).toBe("us-house");
    expect(representatives.facts.district).toMatch(/district/);
    expect(
      representatives.people.every((person) => person.role.startsWith("us-")),
    ).toBe(true);
    expect(
      representatives.people.filter((person) => person.role === "us-senate"),
    ).toHaveLength(2);
  });

  it("ties the state to the player's own legislators, with the governor", () => {
    const state = thing(things, "state");
    expect(state.kind).toBe("represents-you");
    expect(state.facts.office).toMatch(/^state:/);
    expect(state.people[0]!.role).toMatch(/governor$/);
  });

  it("names who runs the player's town, each by their own seat record", () => {
    const town = thing(things, "town");
    expect(town.kind).toBe("runs-your-town");
    expect(town.facts.office).toBe("leader:municipal-mayor");
    expect(town.people[0]!.personId).toBe(town.facts.personId);
    expect(town.sourceRecordIds).toHaveLength(town.people.length);
    town.people.forEach((person, index) => {
      const seat = world.history.organizationParticipations.find(
        (entry) => entry.id === town.sourceRecordIds[index],
      );
      expect(seat?.personId).toBe(person.personId);
    });
  });

  it("picks the family member who matters most by the director's own thread importance", () => {
    const home = thing(things, "home");
    const top = storyThreadsOf(world, personId).find(
      (thread) => thread.tieKind !== null,
    )!;
    expect(home.facts.personId).toBe(top.otherPersonId);
    expect(home.facts.tie).toBe(top.tieKind);
    // The stop shows the whole family, the one who matters most first.
    expect(home.people[0]!.personId).toBe(top.otherPersonId);
    expect(home.people.length).toBeGreaterThan(1);
  });

  it("says why day one starts where it does, from the arrival record", () => {
    const you = thing(things, "you");
    const arrival = world.history.events.find(
      (event) => event.id === you.sourceRecordIds[0],
    )!;
    expect(arrival.type).toBe("life.scene.arrived");
    expect(you.facts.setting).toBe("home");
    // She has a job; the arrival record found no shift at this hour.
    expect(you.facts.because).toBe("no-shift-now");
    expect(arrival.involvedEntityIds).toContain(you.sourceRecordIds[1]);
    // A job the world began with says nothing about how long she has had it.
    expect(you.facts.workingSince).toBeUndefined();
  });

  it("names only people the world has, and writes nothing", () => {
    const before = JSON.stringify(world);
    for (const entry of openingOneThings(world, personId))
      if (entry.kind !== "none")
        for (const person of entry.people)
          expect(world.people[person.personId], entry.stop).toBeDefined();
    expect(JSON.stringify(world)).toBe(before);
  });
});

describe("the one thing per stop, in other lives", () => {
  it("starts a life at work because of its scheduled shift", () => {
    // Seed p6-open-g draws Wichita Falls, Texas.
    const { world, personId, place } = newLife("p6-open-g");
    expect(place).toBe("Wichita Falls, Texas");
    const you = thing(openingOneThings(world, personId), "you");
    expect(you.facts.setting).toBe("work");
    expect(you.facts.because).toBe("scheduled-shift");
    const arrival = world.history.events.find(
      (event) => event.id === you.sourceRecordIds[0],
    )!;
    expect(arrival.tags).toContain(`work:${you.sourceRecordIds[1]}`);
    expect(you.people).toEqual([]);
  });

  it("names the county that runs a place with no government of its own", () => {
    // Seed p6-open-f draws Karns, Tennessee, an unincorporated community.
    const { world, personId, place } = newLife("p6-open-f");
    expect(place).toBe("Karns, Tennessee");
    const town = thing(openingOneThings(world, personId), "town");
    expect(town.kind).toBe("runs-your-town");
    expect(town.facts.government).toBe("Knox County");
    expect(town.facts.servesPlace).toBe("Karns, Tennessee");
    expect(town.people).toEqual([]);
  });
});

describe("one rule in all 56 places", () => {
  it("gives every stop a record-backed thing or the reason there is none", () => {
    const states = lifePlaceStateIdentities();
    expect(states).toHaveLength(56);
    for (const state of states) {
      const small = smallWorld({ place: state.usps, seed: "p6-opening" });
      const things = openingOneThings(small.world as World, small.personId);
      expect(
        things.map((entry) => entry.stop),
        state.usps,
      ).toEqual([...OPENING_STOPS]);
      for (const entry of things) {
        if (entry.kind === "none") {
          expect(entry.reason, `${state.usps} ${entry.stop}`).not.toBe("");
          continue;
        }
        for (const person of entry.people)
          expect(
            small.world.people[person.personId],
            `${state.usps} ${entry.stop}`,
          ).toBeDefined();
      }
    }
  });
});
