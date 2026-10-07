import { describe, expect, it } from "vitest";
import {
  DEFAULT_NEW_GAME_SETUP,
  createNewGameWorld,
} from "../presentation/new-game";
import {
  canonicalJson,
  createCharacterHistoryContextPeople,
  createCharacterHistoryContextPerson,
  drawCanonicalNameForGender,
  generatePersonIdentity,
  lifePlaceStateIdentities,
  makeIsoDate,
  searchLifePlaces,
  SeededRng,
  stableHash,
} from ".";
import type { CharacterHistoryContextPersonInput } from ".";
import type { EntityId } from "./types";

describe("batched context-person writer", () => {
  const base = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "context-people-batch",
  });
  const home = base.world.people[base.playerPersonId]!.homeJurisdictionId;
  const rng = new SeededRng("context-people-batch");
  const inputs: CharacterHistoryContextPersonInput[] = Array.from(
    { length: 40 },
    (_, index) => ({
      stableKey: `context-people-batch:${index}`,
      ...drawCanonicalNameForGender(rng.fork(`name:${index}`), "unstated"),
      identity: generatePersonIdentity(rng.fork(`identity:${index}`)),
      birthDate: makeIsoDate("1968-06-15"),
      homeJurisdictionId: home,
    }),
  );

  it("writes exactly what the single writer writes, including a repeated key", () => {
    const withRepeat = [...inputs, inputs[3]!];
    let single = base.world;
    for (const input of withRepeat)
      single = createCharacterHistoryContextPerson(single, input);
    const batched = createCharacterHistoryContextPeople(base.world, withRepeat);
    expect(canonicalJson(batched.people)).toBe(canonicalJson(single.people));
    expect(batched.personOrder).toEqual(single.personOrder);
    expect(batched.personOrder.length).toBe(
      base.world.personOrder.length + inputs.length,
    );
  });

  it("returns the same world when nothing new is written", () => {
    expect(createCharacterHistoryContextPeople(base.world, [])).toBe(
      base.world,
    );
    const once = createCharacterHistoryContextPeople(base.world, inputs);
    expect(createCharacterHistoryContextPeople(once, inputs)).toBe(once);
  });

  it("validates existing inputs without copying the people table", () => {
    const once = createCharacterHistoryContextPeople(base.world, inputs);
    let enumerations = 0;
    const people = new Proxy(once.people, {
      ownKeys() {
        enumerations += 1;
        if (enumerations > 1)
          throw new Error(
            "An existing-only batch must not copy the people table",
          );
        return Reflect.ownKeys(once.people);
      },
    });
    const existing = { ...once, people };
    expect(createCharacterHistoryContextPeople(existing, inputs)).toBe(
      existing,
    );
    // The first enumeration determines the uncached appearance lineage.
    expect(enumerations).toBe(1);
    expect(() =>
      createCharacterHistoryContextPeople(existing, [
        { ...inputs[0]!, givenName: "" },
      ]),
    ).toThrow("Context-person given name");
  });

  it("preserves mixed batch order and duplicates without mutating its source", () => {
    const once = createCharacterHistoryContextPeople(base.world, [inputs[0]!]);
    const mixed = [inputs[0]!, inputs[1]!, inputs[1]!, inputs[2]!, inputs[0]!];
    const before = canonicalJson(once);
    let single = once;
    for (const input of mixed)
      single = createCharacterHistoryContextPerson(single, input);
    const batch = createCharacterHistoryContextPeople(once, mixed);
    expect(canonicalJson(batch)).toBe(canonicalJson(single));
    expect(canonicalJson(once)).toBe(before);
    expect(batch.personOrder).toEqual(single.personOrder);
    expect(Object.keys(batch.people)).toEqual(Object.keys(single.people));
  });

  it("preserves people table order when a reloaded table differs from person order", () => {
    const once = createCharacterHistoryContextPeople(base.world, [inputs[0]!]);
    const reloaded = {
      ...once,
      people: Object.fromEntries(Object.entries(once.people).reverse()),
    };
    const before = Object.keys(reloaded.people);
    const batch = createCharacterHistoryContextPeople(reloaded, [inputs[1]!]);
    const single = createCharacterHistoryContextPerson(reloaded, inputs[1]!);
    expect(Object.keys(batch.people)).toEqual(Object.keys(single.people));
    expect(Object.keys(batch.people).slice(0, before.length)).toEqual(before);
    expect(canonicalJson(batch)).toBe(canonicalJson(single));
    expect(Object.keys(reloaded.people)).toEqual(before);
  });

  it("recomputes lineage after an external appearance edit", () => {
    const once = createCharacterHistoryContextPeople(base.world, [inputs[0]!]);
    const changed = {
      ...once,
      people: Object.fromEntries(
        Object.entries(once.people).map(([id, person]) => [
          id,
          {
            ...person,
            appearance: {
              seed: `appearance-${id}`,
              recipeVersion: "lineage-edited",
              catalogGeneration: 17,
            },
          },
        ]),
      ),
    };
    const next = createCharacterHistoryContextPeople(changed, [inputs[1]!]);
    const added = next.people[next.personOrder.at(-1)!]!;
    expect(added.appearance?.recipeVersion).toBe("lineage-edited");
    expect(added.appearance?.catalogGeneration).toBe(17);
    expect(
      once.people[once.personOrder.at(-1)!]!.appearance?.recipeVersion,
    ).not.toBe("lineage-edited");
  });

  it("refuses an input the single writer refuses", () => {
    expect(() =>
      createCharacterHistoryContextPeople(base.world, [
        {
          ...inputs[0]!,
          homeJurisdictionId: "jurisdiction_missing" as EntityId,
        },
      ]),
    ).toThrow("existing home jurisdiction");
  });
});

describe("BG-14: generated family mortality dates", () => {
  it("does not give a grandparent couple one birthday and one death day", () => {
    const seed = "bg-14-0";
    const states = lifePlaceStateIdentities();
    const state =
      states[parseInt(stableHash(seed).slice(0, 8), 16) % states.length]!;
    const place = searchLifePlaces("", 1, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    })[0]!;
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    });
    const deaths = game.world.history.personDeaths;
    const birthDates = deaths.map(
      ({ personId }) => game.world.people[personId]!.birthDate,
    );

    expect(states).toHaveLength(56);
    expect(deaths.length).toBeGreaterThan(1);
    expect(new Set(birthDates).size).toBe(birthDates.length);
    expect(new Set(deaths.map(({ diedAt }) => diedAt)).size).toBe(
      deaths.length,
    );
  });
});
