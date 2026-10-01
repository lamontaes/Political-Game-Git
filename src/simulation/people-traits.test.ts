import { canonicalJson } from "./canonical-json";
import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { lifePlaceStateIdentities, searchLifePlaces } from "./life-places";
import { addDays, ageOnDate } from "./dates";
import { stableHash } from "./ids";
import { notableQualityRoom, ensurePeopleTraits } from "./people-traits";
import {
  establishLifePersonality,
  lifePersonalityFromUpbringing,
} from "./life-personality";
import {
  upbringingCoreValueFrom,
  upbringingFor,
  type PersonUpbringing,
} from "./people-upbringing";
import { latestPersonalityTendenciesForPerson } from "./queries";
import type { EntityId, World } from "./types";

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

/** The place of all 56 that this seed draws, with a locality to start in. */
function drawPlace(): { seed: string; usps: string; placeKey: string } {
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  for (let n = 1; n < 200; n++) {
    const seed = `a138-${n}`;
    const place =
      places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!;
    const locality = searchLifePlaces("", 1, {
      stateJurisdictionKey: place.jurisdictionKey,
      scope: "locality",
    })[0];
    if (locality) return { seed, usps: place.usps, placeKey: locality.key };
  }
  throw new Error("No place with a locality was drawn.");
}

/** An upbringing as a comparable value, without whose it is. */
function upbringingShape(world: World, id: EntityId): string {
  return canonicalJson({ ...upbringingFor(world, id), personId: null });
}

/** Every trait record a person starts with, without ids or dates. */
function startingTraits(world: World, id: EntityId) {
  return latestPersonalityTendenciesForPerson(world, id)
    .map(({ tendencyId, expressionKey, strength, scopeTags }) => ({
      tendencyId,
      expressionKey,
      strength,
      scopeTags,
    }))
    .sort((a, b) => (a.tendencyId < b.tendencyId ? -1 : 1));
}

describe("A138: traits come from upbringing, not a lottery", () => {
  const { seed, usps, placeKey } = drawPlace();
  it(`two seeds give the same traits to people with the same upbringing (US-${usps}, seed ${seed})`, () => {
    const open = (worldSeed: string) => {
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: worldSeed,
        placeKey,
        startAge: 40,
        questionnaire: "skipped",
      });
      const people = game.world.personOrder.filter(
        (id) => id !== game.playerPersonId,
      );
      return { world: game.world, people };
    };
    const first = open(`${seed}:first`);
    const second = open(`${seed}:second`);
    const bucket = (world: World, id: EntityId) =>
      `${notableQualityRoom(ageOnDate(world.people[id]!.birthDate, world.currentDate))}|${upbringingShape(world, id)}`;
    const firstByShape = new Map<string, EntityId>();
    for (const id of first.people)
      if (!firstByShape.has(bucket(first.world, id)))
        firstByShape.set(bucket(first.world, id), id);
    const pairs = second.people
      .map((id) => [firstByShape.get(bucket(second.world, id)), id] as const)
      .filter((pair): pair is readonly [EntityId, EntityId] => !!pair[0])
      .slice(0, 6);
    expect(pairs.length).toBeGreaterThan(0);
    for (const [a, b] of pairs) {
      // Both the temperament and the ordinary-life preferences: someone
      // the opening skipped gets them the way a later reader would.
      const start = (world: World, id: EntityId) =>
        startingTraits(
          establishLifePersonality(ensurePeopleTraits(world, [id]), id),
          id,
        );
      const traitsA = start(first.world, a);
      const traitsB = start(second.world, b);
      expect(traitsA.length).toBeGreaterThan(0);
      expect(traitsB).toEqual(traitsA);
    }
  }, 60_000);

  it("leaves a trait at the middle when the upbringing leans neither way", () => {
    const quiet: PersonUpbringing = {
      personId: "person_quiet" as EntityId,
      money: [],
      homeStability: "some-moves",
      caregiving: "inconsistent",
      protectiveCaregiver: false,
      events: [],
      schooling: ["supported-setbacks"],
      firstJob: "none",
    };
    for (const trait of ["sociability", "conflict", "risk"] as const)
      expect(upbringingCoreValueFrom(quiet, trait)).toBe(0);
    expect(lifePersonalityFromUpbringing(quiet)).toMatchObject({
      conversation: "ask",
      leisure: "company",
      privacy: "conflicted",
      connection: "conflicted",
      goal: "learning",
    });
  });
});
