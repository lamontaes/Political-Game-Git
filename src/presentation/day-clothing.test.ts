import { describe, expect, it } from "vitest";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { placeBackdropPeople } from "./backdrop-people";
import { openingTourStagedPeople } from "./opening-tour-people";
import { projectOpeningWorldSnapshot } from "./opening-world-snapshot";
import {
  dayClothing,
  personDayRecipe,
  personDayRecipeWithOutfitExclusions,
  roomDayOutfitExclusions,
} from "./day-clothing";
import { drawRandomPlace } from "../../tests/support/random-place";

/*
 * OW-9: a person's card and every scene draw one outfit for the day. The
 * same people are placed in two different rooms and each is compared with
 * the recipe the card draws.
 */
describe("daily clothing in scene casts", { timeout: 180_000 }, () => {
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

  it(`keeps each person's scene outfit stable across rooms (${place.displayName}, seed ${seed})`, () => {
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
    const outfitsByPerson = new Map<string, string>();
    let compared = 0;
    for (const drawn of [...office, ...park]) {
      const card = personDayRecipe(world, world.people[drawn.personId]!);
      expect(drawn.engine.colors, drawn.personId).toEqual(card?.colors);
      const previous = outfitsByPerson.get(drawn.personId);
      if (previous !== undefined)
        expect(drawn.engine.outfit, drawn.personId).toBe(previous);
      outfitsByPerson.set(drawn.personId, drawn.engine.outfit);
      compared += 1;
    }
    expect(compared).toBeGreaterThan(0);
  });

  it("gives people in one room different non-uniform outfits when alternatives exist", () => {
    const byOutfit = new Map<string, string[]>();
    for (const person of Object.values(world.people)) {
      if (person.id === player || !person.appearance) continue;
      if (dayClothing(world, person.id).uniform) continue;
      const recipe = personDayRecipe(world, person);
      if (!recipe) continue;
      const key = `${recipe.presentation}:${recipe.outfit}`;
      byOutfit.set(key, [...(byOutfit.get(key) ?? []), person.id]);
    }
    const sameOutfit = [...byOutfit.values()].find((ids) => ids.length > 1);
    expect(sameOutfit).toBeDefined();
    const people = placeBackdropPeople(
      world,
      player,
      "office",
      world.currentMoment,
      sameOutfit!.slice(0, 2).map((personId) => ({ personId })),
      { rosterOnly: true },
    );
    const drawn = people.filter((person) =>
      sameOutfit!.slice(0, 2).includes(person.personId),
    );
    expect(drawn).toHaveLength(2);
    expect(drawn[0]!.engine.outfit).not.toBe(drawn[1]!.engine.outfit);
  });

  it("keeps the President's fixed opening figure in the staged outfit after an outfit collision", () => {
    const snapshot = projectOpeningWorldSnapshot(world, player);
    expect(snapshot.president).not.toBeNull();
    expect(snapshot.vicePresident).not.toBeNull();
    const presidentId = snapshot.president!.personId;
    const vicePresidentId = snapshot.vicePresident!.personId;
    expect(vicePresidentId.localeCompare(presidentId)).toBeLessThan(0);

    const president = world.people[presidentId]!;
    const vicePresident = world.people[vicePresidentId]!;
    const presidentBase = personDayRecipe(world, president);
    expect(presidentBase).not.toBeNull();

    // Force a same-presentation saved-outfit collision while preserving the
    // generated officials, date, and recorded room roster.
    const collisionAppearance = (person: typeof president) => ({
      ...person,
      appearance: {
        ...person.appearance!,
        engine: {
          ...person.appearance!.engine,
          version: "people-engine-v1" as const,
          presentation: presidentBase!.presentation,
          outfit: presidentBase!.outfit,
        },
      },
    });
    const collisionWorld = {
      ...world,
      people: {
        ...world.people,
        [presidentId]: collisionAppearance(president),
        [vicePresidentId]: collisionAppearance(vicePresident),
      },
    };
    const presidentInCollisionWorld = collisionWorld.people[presidentId]!;
    const vicePresidentBase = personDayRecipe(
      collisionWorld,
      collisionWorld.people[vicePresidentId]!,
    );
    expect(vicePresidentBase).toMatchObject({
      presentation: presidentBase!.presentation,
      outfit: presidentBase!.outfit,
    });

    const roster = [snapshot.president!, snapshot.vicePresident!].map(
      (official) => ({
        personId: official.personId,
        name: official.personName,
        title: official.title,
        party: null,
        facts: [],
      }),
    );
    const outfitExclusions = roomDayOutfitExclusions(
      collisionWorld,
      roster.map((official) => official.personId),
    );
    expect(outfitExclusions.get(presidentId)).toContain(presidentBase!.outfit);

    const staged = openingTourStagedPeople(
      collisionWorld,
      player,
      "oval-office",
      roster,
      { furniture: true, faceRoom: true },
    );
    const presidentInScene = staged.find(
      (figure) => figure.personId === presidentId,
    );
    expect(presidentInScene).toBeDefined();

    const fixedFigure = personDayRecipeWithOutfitExclusions(
      collisionWorld,
      presidentInCollisionWorld,
      { avoidOutfits: outfitExclusions.get(presidentId) },
    );
    expect(presidentInScene!.engine.outfit).not.toBe(presidentBase!.outfit);
    expect(fixedFigure?.outfit).toBe(presidentInScene!.engine.outfit);
    expect(fixedFigure?.colors).toEqual(presidentInScene!.engine.colors);
  });
});
