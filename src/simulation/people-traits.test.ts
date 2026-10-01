import { canonicalJson } from "./canonical-json";
import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { searchLifePlaces } from "./life-places";
import { addDays } from "./dates";
import { ensurePeopleTraits } from "./people-traits";

describe("a seeded temperament", () => {
  it("batches actors without changing their individual first-record dates", () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "traits-batch-dates",
      startAge: 40,
      questionnaire: "skipped",
    });
    const people = game.world.personOrder
      .filter(
        (id) =>
          id !== game.playerPersonId &&
          game.world.people[id]!.birthDate <
            addDays(game.world.currentDate, -30),
      )
      .slice(0, 2);
    expect(people).toHaveLength(2);
    const dates = new Map(
      people.map((id, at) => [
        id,
        addDays(game.world.currentDate, -30 + at * 10),
      ]),
    );
    let sequential = game.world;
    for (const id of people)
      sequential = ensurePeopleTraits(sequential, [id], dates.get(id)!);
    const batched = ensurePeopleTraits(game.world, people, dates);
    expect(canonicalJson(batched)).toBe(canonicalJson(sequential));
  });
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
