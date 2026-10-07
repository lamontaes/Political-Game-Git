import { describe, expect, it } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { projectOpeningFamily } from "../presentation/opening-story";
import { dayClothing, personDayRecipe } from "../presentation/day-clothing";
import { readFileSync } from "node:fs";
import {
  homePlaceFor,
  homePlaceForPerson,
  homePlacesForPerson,
  middayBackdropUrl,
} from "../presentation/place-backdrops";
import { PEOPLE_PACK } from "../presentation/appearance-engine/runtime";
import { orientationBackdrop } from "./WorldOrientationPanel";
import { openingTourStagedPeople } from "../presentation/opening-tour-people";
import { drawRandomPlace } from "../../tests/support/random-place";

/*
 * OW-17: the family screen stands the household in its own home, and each
 * parent wears what their own job calls for, not a suit for the tour.
 */
describe("the family screen", { timeout: 180_000 }, () => {
  const seed = "ow17-family-2026-10-06";
  const place = drawRandomPlace(seed);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 17,
      questionnaire: "skipped",
    }),
  ).game!;
  const world = game.world;
  const player = game.playerPersonId;

  it(`uses the household's home picture (${place.displayName}, seed ${seed})`, () => {
    const home = homePlaceForPerson(world, player);
    const backdrop = orientationBackdrop("parents", {
      whiteHouse: null,
      regionalPlate: null,
      regionScene: null,
      homePlaces: homePlacesForPerson(world, player),
    });
    expect(backdrop).toMatchObject({ kind: "place", place: home });
  });

  it("maps every dwelling kind to a staged, painted home", () => {
    const staging = JSON.parse(
      readFileSync("art/backdrops/staging.json", "utf8"),
    ) as { places: Record<string, unknown> };
    const kinds = [
      "residential:multi-unit",
      "residential:apartment",
      "residential:mobile-home",
      "residential:other-mobile",
      "residential:rowhouse",
      "residential:large-house",
      "residential:farmhouse",
      "residential:single-family",
      "custom:unrecorded",
      null,
    ] as const;
    for (const kind of kinds) {
      const home = homePlaceFor(kind);
      expect(staging.places[home], String(kind)).toBeDefined();
      expect(middayBackdropUrl(home), String(kind)).not.toBeNull();
    }
    for (const home of homePlacesForPerson(world, player))
      expect(staging.places[home], home).toBeDefined();
  });

  it("never falls to the plain gradient while any home is painted", () => {
    const backdrop = orientationBackdrop("parents", {
      whiteHouse: null,
      regionalPlate: null,
      regionScene: null,
      homePlaces: ["no-such-home", ...homePlacesForPerson(world, player)],
    });
    expect(backdrop.kind).toBe("place");
  });

  it("prints the name tag in dark ink at 4.5:1 or better on the plate", () => {
    const css = readFileSync("src/player/opening-family.css", "utf8");
    const rule = /\.scene-place-nametag \{[^}]*\}/.exec(css)?.[0] ?? "";
    expect(rule).toContain("color: #000;");
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((at) => {
        const c = parseInt(hex.slice(at, at + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    // The plate's darkest end is its worst case.
    const ratio = (lum("#96703a") + 0.05) / (lum("#000000") + 0.05);
    expect(rule).toContain("#96703a");
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("stands every parent on the home's own spots", () => {
    const { parents } = projectOpeningFamily(world, player);
    const staged = openingTourStagedPeople(
      world,
      player,
      homePlaceForPerson(world, player),
      parents.map((parent) => ({
        personId: parent.personId,
        name: parent.introduction,
        title: parent.introduction,
      })) as never,
      { furniture: false, faceRoom: true },
    );
    expect(staged.overflow).toEqual([]);
    expect(staged.map((person) => person.personId).sort()).toEqual(
      parents.map((parent) => parent.personId).sort(),
    );
  });

  it("dresses each parent from their own job", () => {
    const { parents } = projectOpeningFamily(world, player);
    expect(parents.length).toBeGreaterThan(0);
    for (const parent of parents) {
      const person = world.people[parent.personId]!;
      const recipe = personDayRecipe(world, person);
      if (!recipe) continue;
      const clothing = dayClothing(world, person.id);
      const outfit = PEOPLE_PACK.presentations[
        recipe.presentation
      ].outfits.find((entry) => entry.id === recipe.outfit)!;
      if (clothing.uniform) expect(recipe.outfit).toBe(clothing.uniform);
      else expect(outfit.tags, parent.introduction).toContain(clothing.wear);
    }
  });
});
