import { describe, expect, it } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { projectOpeningFamily } from "../presentation/opening-story";
import { dayClothing, personDayRecipe } from "../presentation/day-clothing";
import { homePlaceForPerson } from "../presentation/place-backdrops";
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
      homePlace: home,
    });
    expect(backdrop).toMatchObject({ kind: "place", place: home });
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
