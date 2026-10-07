import { describe, expect, it } from "vitest";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { placeBackdropPeople } from "./backdrop-people";
import { personDayRecipe } from "./day-clothing";
import { drawRandomPlace } from "../../tests/support/random-place";

/*
 * OW-9: a person's card and every scene draw one outfit for the day. The
 * same people are placed in two different rooms and each is compared with
 * the recipe the card draws.
 */
describe("one outfit per person per day", { timeout: 180_000 }, () => {
  const seed = "ow9-one-outfit-2026-10-06";
  const place = drawRandomPlace(seed);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 30,
      questionnaire: "skipped",
    }),
  ).game!;
  const world = game.world;
  const player = game.playerPersonId;

  it(`dresses the same people alike in the card and in two rooms (${place.displayName}, seed ${seed})`, () => {
    const present = Object.values(world.people)
      .filter((person) => person.id !== player && person.appearance)
      .slice(0, 3)
      .map((person) => ({ personId: person.id }));
    expect(present.length).toBeGreaterThan(0);
    const office = placeBackdropPeople(
      world,
      player,
      "office",
      undefined,
      present,
      { rosterOnly: true },
    );
    const park = placeBackdropPeople(
      world,
      player,
      "park",
      undefined,
      present,
      { rosterOnly: true },
    );
    let compared = 0;
    for (const drawn of [...office, ...park]) {
      const card = personDayRecipe(world, world.people[drawn.personId]!);
      expect(drawn.engine.outfit, drawn.personId).toBe(card?.outfit);
      expect(drawn.engine.colors, drawn.personId).toEqual(card?.colors);
      compared += 1;
    }
    expect(compared).toBeGreaterThan(0);
  });
});
