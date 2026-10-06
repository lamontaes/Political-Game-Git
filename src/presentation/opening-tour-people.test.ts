import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { observerPlace, observerSetup } from "./observer-world";
import { projectGovernmentBrowser } from "./politics-government";
import {
  openingLegislaturePeople,
  openingFamilyPeople,
  openingTourStagedPeople,
} from "./opening-tour-people";
import { SeededRng } from "../simulation/rng";
import { projectOpeningFamily } from "./opening-story";
import { orientationBackdrop } from "../player/WorldOrientationPanel";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../simulation/life-places";
import { placeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";

function unincorporatedPlace(seed: string) {
  const rng = new SeededRng(seed);
  const states = [...lifePlaceStateIdentities()];
  while (states.length) {
    const state = states.splice(rng.integer(0, states.length), 1)[0]!;
    const places = searchLifePlaces("", 5000, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    }).filter((place) => {
      const units = placeLocalGovernmentUnits(place);
      return (
        !units.municipal.length &&
        !units.townships.length &&
        units.counties.length > 0
      );
    });
    if (places.length) return rng.pick(places);
  }
  throw new Error("No unincorporated place available");
}

const cases = [
  { seed: "team8-opening-1-a", place: observerPlace("team8-opening-1-a") },
  { seed: "team8-opening-1-b", place: observerPlace("team8-opening-1-b") },
  {
    seed: "team8-opening-1-c",
    place: unincorporatedPlace("team8-opening-1-c"),
  },
];

it("the family reuses an admitted regional plate and keeps missing coverage neutral", () => {
  const sources = {
    whiteHouse: null,
    regionScene: null,
    homeStateUsps: "AZ",
    regionalPlate: {
      regionKey: "sonoran-desert",
      displayName: "Sonoran Desert",
      url: "/assets/env_regional_sonoran_desert_v1.png",
      width: 2208,
      height: 1584,
      matchedBy: "state",
      sceneKind: "open-landscape" as const,
      alternatives: [],
    },
  };
  expect(orientationBackdrop("parents", sources)).toEqual(
    orientationBackdrop("state", sources),
  );
  expect(
    orientationBackdrop("parents", { ...sources, regionalPlate: null }),
  ).toEqual({ kind: "neutral" });
});

describe("recorded representatives on the opening legislature card", () => {
  for (const { seed, place } of cases)
    it(`${seed}: ${place.displayName}`, { timeout: 120_000 }, () => {
      const game = generateOpeningLife(
        prepareOpeningLife(observerSetup(seed, place.key)),
      ).game!;
      const { world, playerPersonId } = game;
      const before = JSON.stringify(world);
      const people = openingLegislaturePeople(world, playerPersonId);
      const holders = projectGovernmentBrowser(world, playerPersonId, {
        scope: "state",
      })
        .representedBy!.filter((row) => row.key.startsWith("state:"))
        .flatMap((row) =>
          row.holders.filter(
            (holder) => holder.status === "member" && holder.personId,
          ),
        );
      expect(people.map((person) => person.personId)).toEqual(
        holders.map((holder) => holder.personId),
      );
      const staged = openingTourStagedPeople(
        world,
        playerPersonId,
        "state-legislative-chamber-bicameral",
        people,
      );
      expect(
        [...staged, ...staged.overflow].map((person) => person.personId).sort(),
      ).toEqual(people.map((person) => person.personId).sort());
      for (const person of staged)
        expect(person.title).toBe(
          people.find((record) => record.personId === person.personId)!.title,
        );
      const family = openingFamilyPeople(world, playerPersonId);
      const saved = projectOpeningFamily(world, playerPersonId);
      expect(family.length).toBeGreaterThan(0);
      expect(family.map((person) => person.personId)).toEqual(
        saved.parents.map((member) => member.personId),
      );
      for (const person of family) {
        expect(world.people[person.personId]).toBeDefined();
        expect(
          saved.parents.find((member) => member.personId === person.personId)
            ?.introduction,
        ).toBe(`${person.name}, ${person.title}`);
      }
      expect(openingFamilyPeople(JSON.parse(before), playerPersonId)).toEqual(
        family,
      );
      mkdirSync("test-results/team8", { recursive: true });
      writeFileSync(
        `test-results/team8/${seed}-family.json`,
        JSON.stringify({ game, family, seed, placeKey: place.key }),
      );
      expect(JSON.stringify(world)).toBe(before);
      mkdirSync("test-results/team8", { recursive: true });
      writeFileSync(
        `test-results/team8/${seed}.json`,
        JSON.stringify({
          game,
          people,
          seed,
          placeKey: place.key,
          placeName: place.displayName,
        }),
      );
      process.stdout.write(
        `${JSON.stringify({ seed, placeKey: place.key, name: place.displayName, unincorporated: !placeLocalGovernmentUnits(place).municipal.length, representativeCount: people.length, stagedCount: staged.length })}\n`,
      );
    });
});
