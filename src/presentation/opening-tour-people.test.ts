import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { observerPlace, observerSetup } from "./observer-world";
import { projectGovernmentBrowser } from "./politics-government";
import {
  openingLegislaturePeople,
  openingCountyScene,
  openingTourStagedPeople,
} from "./opening-tour-people";
import { SeededRng } from "../simulation/rng";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../simulation/life-places";
import {
  placeLocalGovernmentUnits,
  homeLocalGovernmentUnits,
} from "../simulation/nationwide-world/local-governments";
import { sittingLocalOfficers } from "../simulation/living-world/local-government-seats";

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
      expect(staged.map((person) => person.personId).sort()).toEqual(
        people.map((person) => person.personId).sort(),
      );
      for (const person of staged)
        expect(person.title).toBe(
          people.find((record) => record.personId === person.personId)!.title,
        );
      const county = openingCountyScene(world, playerPersonId);
      const units = homeLocalGovernmentUnits(world, playerPersonId);
      if (units.municipal.length || units.townships.length)
        expect(county).toBeNull();
      else {
        expect(county?.people.map((person) => person.personId)).toEqual(
          units.counties.flatMap((unit) =>
            sittingLocalOfficers(world, unit).map((seat) => seat.personId),
          ),
        );
        expect(county?.people.length).toBeGreaterThan(0);
        expect(
          county?.people.some((person) =>
            /your district|supervisor/i.test(person.title),
          ),
        ).toBe(false);
      }
      expect(openingCountyScene(JSON.parse(before), playerPersonId)).toEqual(
        county,
      );
      writeFileSync(
        `test-results/team8/${seed}-county.json`,
        JSON.stringify({ game, county, seed, placeKey: place.key }),
      );
      expect(JSON.stringify(world)).toBe(before);
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
