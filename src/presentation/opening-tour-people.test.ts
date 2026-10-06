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
import { projectLivingSceneOpening } from "./living-scene-facts";
import { introPlacementTrace } from "./intro-placement-trace";
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

it(
  "traces actual chosen intro spots and saved public-role records without claiming attendance",
  { timeout: 120_000 },
  () => {
    const { seed, place } = cases[0]!;
    const game = generateOpeningLife(
      prepareOpeningLife(observerSetup(seed, place.key)),
    ).game!;
    const { world, playerPersonId } = game;
    const before = JSON.stringify(world);
    const chapters = projectLivingSceneOpening(world, playerPersonId).chapters;
    const executives = chapters.find((c) => c.key === "executive")!.actors;
    expect(executives.length).toBeGreaterThan(0);
    const oval = openingTourStagedPeople(
      world,
      playerPersonId,
      "oval-office",
      executives.map((a) => a.person),
    );
    // Existing turned head/hair source is unavailable: the proof must expose it.
    expect(oval).toHaveLength(0);
    expect(oval.overflow).toHaveLength(executives.length);
    expect(oval.overflow.every((p) => p.reason === "missing-art")).toBe(true);
    expect(introPlacementTrace(oval, executives).unstagedActors).toHaveLength(
      executives.length,
    );
    const actors = chapters.find((c) => c.key === "congress")!.actors;
    const placements = openingTourStagedPeople(
      world,
      playerPersonId,
      "us-capitol-exterior",
      actors.map((a) => a.person),
    );
    const trace = introPlacementTrace(placements, actors);
    expect(trace.people.length).toBeGreaterThan(0);
    for (const row of trace.people) {
      const chosen = placements.find((p) => p.personId === row.personId)!;
      const actor = actors.find((a) => a.person.personId === row.personId)!;
      expect(row.slotId).toBe(chosen.slotId);
      expect(row.slotRole).toBe(chosen.slotRole);
      expect(row.pose).toBe(chosen.resolvedPose);
      expect(row.facing).toBe(chosen.facing);
      expect(row.depth).toBe(chosen.depth);
      expect(row.selection?.recordIds).toEqual(actor.recordIds);
      expect(row.selection?.presenceBasis).toBe("illustrative-public-role");
      expect(row.selectionGap).toBeNull();
      expect(row.art.files.length).toBeGreaterThan(0);
    }
    expect(introPlacementTrace([], actors).unstagedActors).toHaveLength(
      actors.length,
    );
    expect(
      introPlacementTrace(placements, []).people.every(
        (p) => p.selection === null && p.selectionGap === "missing-actor",
      ),
    ).toBe(true);
    expect(JSON.stringify(world)).toBe(before);
  },
);
