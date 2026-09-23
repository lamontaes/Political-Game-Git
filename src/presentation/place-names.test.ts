import { describe, expect, it } from "vitest";

import { previewCreatorNames } from "./creator-name-preview";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import type { NewGameSetup } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import {
  DEFAULT_CORPUS_VERSION,
  familyNameFromParent,
  lifePlaceSearch,
  NAMES_STARTER_V1,
  nameCorpusVersionForWorld,
  PUERTO_RICO_NAMES_V1,
  surnamePair,
} from "../simulation";
import type { World } from "../simulation";

// A life begun in Mayagüez drew Douglas Pope and Trevor Clay from the creator's
// random name button, and a household of Alexander Rosado, Frances Patton and
// Waylon Rosado. The national tables do not cover the island's births.
const ISLAND_GIVEN = new Set(PUERTO_RICO_NAMES_V1.givenNames);
const ISLAND_SURNAMES = new Set(PUERTO_RICO_NAMES_V1.familyNames);

function mayaguez(): string {
  return lifePlaceSearch("Mayagüez", 10, {
    stateJurisdictionKey: "US-PR",
    scope: "locality",
  }).find((place) => place.displayName.startsWith("Mayagüez"))!.key;
}

function islandName(familyName: string): boolean {
  const pair = surnamePair(familyName);
  return pair !== null && pair.every((surname) => ISLAND_SURNAMES.has(surname));
}

function start(setup: Partial<NewGameSetup>): World {
  return generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, ...setup }),
  ).game!.world;
}

function parentsOf(world: World, childId: string) {
  return world.history.kinshipRelationships
    .filter(
      (kinship) =>
        kinship.kind === "lineal:parent-child" &&
        kinship.personIds[1] === childId,
    )
    .map((kinship) => world.people[kinship.personIds[0]]!);
}

describe("reading a name written with two surnames", () => {
  it("keeps a particle with the surname it belongs to", () => {
    expect(surnamePair("Rivera Colón")).toEqual(["Rivera", "Colón"]);
    expect(surnamePair("Rivera de Jesús")).toEqual(["Rivera", "de Jesús"]);
    expect(surnamePair("Del Valle Ortiz")).toEqual(["Del Valle", "Ortiz"]);
    expect(surnamePair("de la Cruz Rivera")).toEqual(["de la Cruz", "Rivera"]);
    expect(surnamePair("Pope")).toBeNull();
    expect(surnamePair("Ortiz Vélez Colón")).toBeNull();
  });

  it("gives a parent the surname they passed on, then their own second", () => {
    expect(familyNameFromParent("Ortiz Vélez", 0, "Ortiz Huyke")).toBe(
      "Ortiz Huyke",
    );
    expect(familyNameFromParent("Ortiz Vélez", 1, "Colón Soto")).toBe(
      "Vélez Soto",
    );
    expect(familyNameFromParent("Pope", 0, "Clay")).toBeNull();
  });
});

describe("the creator's random name button", () => {
  it("draws the island's names once Puerto Rico is chosen", () => {
    for (let salt = 1; salt <= 40; salt += 1) {
      const draw = previewCreatorNames("mayaguez", "male", salt, "PR");
      expect(ISLAND_GIVEN.has(draw.givenName)).toBe(true);
      expect(islandName(draw.familyName)).toBe(true);
    }
  });

  it("draws exactly what it drew before anywhere else", () => {
    for (let salt = 1; salt <= 40; salt += 1) {
      const before = previewCreatorNames("ohio", "female", salt);
      expect(previewCreatorNames("ohio", "female", salt, "OH")).toEqual(before);
      expect(NAMES_STARTER_V1.familyNames).toContain(before.familyName);
    }
  });
});

describe("a new life in Mayagüez", () => {
  it("names the child's household from the island's names", () => {
    let parentsSeen = 0;
    for (const seed of ["pr-a", "pr-b", "pr-c", "pr-d"]) {
      const world = start({ seed, placeKey: mayaguez(), startAge: 10 });
      const player = world.people[world.personOrder[0]!]!;
      expect(islandName(player.familyName)).toBe(true);
      const household = world.history.householdMemberships
        .filter((entry) => entry.personId !== player.id)
        .map((entry) => world.people[entry.personId]!);
      expect(household.length).toBeGreaterThan(0);
      for (const person of household) {
        expect(ISLAND_GIVEN.has(person.givenName)).toBe(true);
        expect(islandName(person.familyName)).toBe(true);
      }
      // A child carries one surname from each parent, and each parent has the
      // one they passed on first.
      const pair = surnamePair(player.familyName)!;
      const parents = parentsOf(world, player.id);
      parentsSeen += parents.length;
      const passed = parents.map(
        (parent) => surnamePair(parent.familyName)![0],
      );
      for (const surname of passed) expect(pair).toContain(surname);
      if (parents.length === 2) expect(new Set(passed).size).toBe(2);
    }
    expect(parentsSeen).toBeGreaterThan(0);
  }, 240_000);

  it("gives a grown character's parent the first surname and a different first name", () => {
    let parentsSeen = 0;
    for (const seed of ["pr-adult-a", "pr-adult-b", "pr-adult-c"]) {
      const world = start({ seed, placeKey: mayaguez(), startAge: 34 });
      const player = world.people[world.personOrder[0]!]!;
      for (const parent of parentsOf(world, player.id)) {
        parentsSeen += 1;
        expect(surnamePair(parent.familyName)![0]).toBe(
          surnamePair(player.familyName)![0],
        );
        expect(parent.givenName).not.toBe(player.givenName);
        expect(ISLAND_GIVEN.has(parent.givenName)).toBe(true);
      }
    }
    expect(parentsSeen).toBeGreaterThan(0);
  }, 240_000);

  it("names the people the player meets later from the island's names", () => {
    const world = start({
      seed: "pr-later",
      placeKey: mayaguez(),
      startAge: 10,
    });
    const home = world.people[world.personOrder[0]!]!.homeJurisdictionId;
    expect(nameCorpusVersionForWorld(world, home)).toBe(
      PUERTO_RICO_NAMES_V1.version,
    );
  }, 120_000);

  it("keeps an old save's national names", () => {
    const legacy: Partial<NewGameSetup> = {
      seed: "pr-legacy",
      placeKey: mayaguez(),
      startAge: 10,
      placeNameVersion: undefined,
    };
    const world = start(legacy);
    const player = world.people[world.personOrder[0]!]!;
    expect(NAMES_STARTER_V1.familyNames).toContain(player.familyName);
    expect(nameCorpusVersionForWorld(world, player.homeJurisdictionId)).toBe(
      DEFAULT_CORPUS_VERSION,
    );
  }, 120_000);
});

describe("a new life anywhere else", () => {
  it("draws the same people it drew before the island had its own names", () => {
    const placeKey = lifePlaceSearch("Des Moines", 10, {
      stateJurisdictionKey: "US-IA",
      scope: "locality",
    })[0]!.key;
    const names = (world: World) =>
      world.personOrder.map((id) => {
        const person = world.people[id]!;
        return `${person.givenName} ${person.familyName} ${person.birthDate}`;
      });
    const now = start({ seed: "iowa", placeKey, startAge: 10 });
    const before = start({
      seed: "iowa",
      placeKey,
      startAge: 10,
      placeNameVersion: undefined,
    });
    expect(names(now)).toEqual(names(before));
  }, 240_000);
});
