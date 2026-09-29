import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { searchLifePlaces } from "./life-places";
import { addDays } from "./dates";
import { ensurePeopleTraits } from "./people-traits";

describe("a seeded temperament", () => {
  it("is on record from the earlier day a decision asks for", () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "traits-on-an-earlier-day",
      placeKey: searchLifePlaces("", 1, {
        stateJurisdictionKey: "US-NM",
        scope: "locality",
      })[0]!.key,
      startAge: 40,
      questionnaire: "skipped",
    });
    const world = game.world;
    const earlier = addDays(world.currentDate, -30);
    const other = world.personOrder.find(
      (id) =>
        id !== game.playerPersonId && world.people[id]!.birthDate < earlier,
    )!;
    expect(other).toBeDefined();
    const written = ensurePeopleTraits(world, [other], earlier);
    const seeds = written.history.personalityTendencies.filter(
      (record) =>
        record.personId === other && record.stableKey.endsWith(":seed"),
    );
    expect(seeds.length).toBeGreaterThan(0);
    for (const record of seeds) expect(record.recordedAt).toBe(earlier);
  });
});
