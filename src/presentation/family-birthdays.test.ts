import { describe, expect, it } from "vitest";

import { searchLifePlaces } from "../simulation/life-places";
import type { World } from "../simulation/types";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";

/**
 * Six Northeast lives found every parent and sibling sharing the player's
 * birthday: each was written a whole number of years apart, to the day.
 */

function childIn(name: string, state: string, seed: string, withRepair = true) {
  const place = searchLifePlaces(name, 20, {
    stateJurisdictionKey: `US-${state}`,
  }).find((candidate) => candidate.displayName.startsWith(name))!;
  expect(place, `${name}, ${state}`).toBeDefined();
  const { familyBirthdayVersion, ...withoutRepair } = DEFAULT_NEW_GAME_SETUP;
  void familyBirthdayVersion;
  const game = createNewGameWorld({
    ...(withRepair ? DEFAULT_NEW_GAME_SETUP : withoutRepair),
    seed,
    startAge: 8,
    placeKey: place.key,
  });
  return { world: game.world, playerId: game.playerPersonId };
}

const others = (world: World, playerId: string) =>
  world.personOrder
    .filter((id) => id !== playerId)
    .map((id) => world.people[id]!);

describe("the people a start writes have birthdays of their own", () => {
  it("does not give the whole family the player's birthday", () => {
    let checked = 0;
    for (const [town, state] of [
      ["Tucson", "AZ"],
      ["Burlington", "VT"],
      ["Fargo", "ND"],
      ["Savannah", "GA"],
    ] as const) {
      const { world, playerId } = childIn(town, state, `birthdays:${town}`);
      const player = world.people[playerId]!;
      const people = others(world, playerId);
      expect(people.length).toBeGreaterThan(1);
      const shared = people.filter(
        (person) => person.birthDate.slice(5) === player.birthDate.slice(5),
      );
      // Chance allows one, never the household and class together.
      expect(shared.length, `${town}: ${people.length} people`).toBeLessThan(2);
      checked += people.length;
    }
    expect(checked).toBeGreaterThan(8);
  }, 300_000);

  it("never brings a brother or sister closer than the years the draw set", () => {
    let siblings = 0;
    for (let index = 0; index < 12; index += 1) {
      const { world, playerId } = childIn("Tucson", "AZ", `sibling:${index}`);
      const player = world.people[playerId]!;
      for (const kinship of world.history.kinshipRelationships) {
        if (!kinship.kind.includes("sibling")) continue;
        if (!kinship.personIds.includes(playerId)) continue;
        const siblingId = kinship.personIds.find((id) => id !== playerId)!;
        const days = Math.abs(
          (Date.parse(world.people[siblingId]!.birthDate) -
            Date.parse(player.birthDate)) /
            86_400_000,
        );
        // The draw sets siblings two to four years apart.
        expect(days).toBeGreaterThanOrEqual(2 * 365 - 1);
        siblings += 1;
      }
    }
    expect(siblings).toBeGreaterThan(2);
  }, 300_000);

  it("rebuilds an old start, without the repair, exactly as it was", () => {
    const { world, playerId } = childIn(
      "Tucson",
      "AZ",
      "birthdays:Tucson",
      false,
    );
    const player = world.people[playerId]!;
    for (const person of others(world, playerId))
      expect(person.birthDate.slice(5)).toBe(player.birthDate.slice(5));
  }, 300_000);
});
