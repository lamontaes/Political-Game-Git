import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  addDays,
  ageOnDate,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  activePartnershipsAt,
  householdMembershipsAt,
} from "../../src/simulation/life-queries";
import { YOUNGEST_AGE_AT_BIRTH } from "../../src/simulation/birth-rates";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import {
  MINIMUM_PARENT_AGE_AT_BIRTH,
  parentsOf,
} from "../../src/simulation/people-family";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import {
  TOWN_BIRTH_RATES_BY_AGE,
  TOWN_FAMILIES_VERSION,
  TOWN_FAMILY_EVENTS,
  describeTownFamilies,
  reviewTownFamilies,
} from "../../src/simulation/living-world/town-families";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type { EntityId, World } from "../../src/simulation";

const LEXINGTON = "2146027";
const BOISE = "1608830";
const QUARTERS = 20;

function openAt(placeKey: string, seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey,
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  const world = game.world;
  const personId = game.playerPersonId;
  return { world, personId, town: world.people[personId]!.homeJurisdictionId };
}

function familyEvents(world: World, town: EntityId) {
  return world.history.events.filter((event) =>
    event.stableKey.startsWith(`${TOWN_FAMILIES_VERSION}:${town}:`),
  );
}

describe(
  "the town's families change over five years",
  { timeout: 300_000 },
  () => {
    const opened = openAt(LEXINGTON, "families-lexington");
    const { personId, town } = opened;
    const snapshots: World[] = [];
    let world = opened.world;
    // Only the calendar moves, and only the review writes. The whole-world
    // check is deferred because the world's other due items are not run here;
    // the watched-world report runs this review on the real clock.
    withWorldIntegrityDeferred(() => {
      for (let round = 0; round < QUARTERS; round += 1) {
        const date = addDays(world.currentDate, 91);
        world = {
          ...world,
          currentDate: date,
          currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
        };
        world = reviewTownFamilies(world, town, personId, `test-${round}`);
        snapshots.push(world);
      }
    });

    it("couples date, move in, marry and part, and children are born", () => {
      const counts = describeTownFamilies(world, town);
      expect(counts[TOWN_FAMILY_EVENTS.startedDating] ?? 0).toBeGreaterThan(0);
      expect(counts[TOWN_FAMILY_EVENTS.movedIn] ?? 0).toBeGreaterThan(0);
      expect(counts[TOWN_FAMILY_EVENTS.married] ?? 0).toBeGreaterThan(0);
      expect(
        (counts[TOWN_FAMILY_EVENTS.brokeUp] ?? 0) +
          (counts[TOWN_FAMILY_EVENTS.divorced] ?? 0),
      ).toBeGreaterThan(0);
      expect(counts.births).toBeGreaterThan(0);
    });

    it("every change is dated on its review, and nobody has two partners", () => {
      for (const snapshot of snapshots) {
        for (const event of familyEvents(snapshot, town))
          if (event.stableKey.includes(`:test-${snapshots.indexOf(snapshot)}:`))
            expect(event.occurredAt).toBe(snapshot.currentDate);
      }
      for (const id of world.personOrder) {
        if (world.history.personDeaths.some((row) => row.personId === id))
          continue;
        expect(activePartnershipsAt(world, id).length, id).toBeLessThanOrEqual(
          1,
        );
      }
    });

    it("a newborn has its mother, her partner when they live together, and her home", () => {
      const births = familyEvents(world, town).filter(
        (event) => event.type === "life.family-member-added",
      );
      expect(births.length).toBeGreaterThan(0);
      for (const birth of births) {
        const child = birth.participants.find(
          (row) => row.role === "focus:subject",
        )!.personId!;
        const parents = parentsOf(world, child);
        expect(parents.length).toBeGreaterThanOrEqual(1);
        expect(parents.length).toBeLessThanOrEqual(2);
        const mother = parents.find(
          (id) => world.people[id]!.identity?.gender === "female",
        )!;
        const age = ageOnDate(
          world.people[mother]!.birthDate,
          birth.occurredAt,
        );
        expect(age).toBeGreaterThanOrEqual(MINIMUM_PARENT_AGE_AT_BIRTH);
        expect(age).toBeLessThanOrEqual(49);
        const home = (id: EntityId) =>
          householdMembershipsAt(world, id)[0]?.household.id;
        // A later breakup may move one parent out; the child keeps a parent.
        expect(parents.map(home)).toContain(home(child));
      }
    });

    it("nobody dates a relative", () => {
      for (const partnership of world.history.partnerships) {
        if (!partnership.stableKey.startsWith(TOWN_FAMILIES_VERSION)) continue;
        const [a, b] = partnership.personIds;
        expect(
          world.history.kinshipRelationships.some(
            (row) => row.personIds.includes(a) && row.personIds.includes(b),
          ),
        ).toBe(false);
      }
    });

    it("leaves the player's own life to the player", () => {
      for (const partnership of world.history.partnerships)
        if (partnership.stableKey.startsWith(TOWN_FAMILIES_VERSION))
          expect(partnership.personIds).not.toContain(personId);
      for (const birth of familyEvents(world, town))
        expect(birth.involvedEntityIds).not.toContain(personId);
    });

    it("a partner who leaves a shared home gets a home of their own in town", () => {
      const partings = familyEvents(world, town).filter(
        (event) => event.type === TOWN_FAMILY_EVENTS.divorced,
      );
      for (const parting of partings) {
        const [a, b] = parting.involvedEntityIds as EntityId[];
        const home = (id: EntityId) =>
          householdMembershipsAt(world, id)[0]?.household.id;
        if (
          world.history.personDeaths.some((row) =>
            [a, b].includes(row.personId),
          )
        )
          continue;
        if (world.people[a]!.homeJurisdictionId !== town) continue;
        if (world.people[b]!.homeJurisdictionId !== town) continue;
        expect(home(a)).not.toBe(home(b));
      }
    });

    it("runs a round once", () => {
      expect(
        reviewTownFamilies(world, town, personId, `test-${QUARTERS - 1}`),
      ).toBe(world);
    });
  },
);

/** The largest place of each state and D.C., Honolulu, and one per territory. */
function onePlaceEach(): readonly string[] {
  const largest = new Map<string, [string, number]>();
  for (const pair of PLACE_POPULATION_ROWS.split(";")) {
    const [geoid, people] = pair.split(":") as [string, string];
    const state = geoid.slice(0, 2);
    if ((largest.get(state)?.[1] ?? -1) < Number(people))
      largest.set(state, [geoid, Number(people)]);
  }
  largest.set("15", ["1571550", 0]);
  largest.set("72", ["7276770", 0]);
  for (const [key, , usps] of TERRITORY_PLACE_ROWS)
    if (!largest.has(usps)) largest.set(usps, [key, 0]);
  return [...largest.values()].map(([key]) => key).sort();
}

/** Every woman in town but the player is made `age` before each review. */
function reviewAtAge(
  placeKey: string,
  seed: string,
  age: number,
  rounds: number,
) {
  const opened = openAt(placeKey, seed);
  const { personId, town } = opened;
  const women = opened.world.personOrder.filter((id) => {
    const person = opened.world.people[id]!;
    return (
      id !== personId &&
      person.homeJurisdictionId === town &&
      person.identity?.gender === "female"
    );
  });
  let world = opened.world;
  const parentAges: number[] = [];
  withWorldIntegrityDeferred(() => {
    for (let round = 0; round < rounds; round += 1) {
      const date = addDays(world.currentDate, 91);
      const birthDate = addDays(date, -(age * 365 + 100));
      const people = { ...world.people };
      for (const id of women) people[id] = { ...people[id]!, birthDate };
      world = {
        ...world,
        people,
        currentDate: date,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
      };
      world = reviewTownFamilies(world, town, personId, `young-${round}`);
      // Ages are read on the day, before the next round re-ages the women.
      for (const event of familyEvents(world, town))
        if (
          event.type === "life.family-member-added" &&
          event.occurredAt === date
        )
          for (const row of event.participants)
            if (row.role === "agency:parent")
              parentAges.push(
                ageOnDate(world.people[row.personId!]!.birthDate, date),
              );
    }
  });
  return { world, town, women, parentAges };
}

describe(
  "the youngest parent is one rule, read from the birth table, in every place",
  { timeout: 900_000 },
  () => {
    it("the family writer's youngest parent is the table's first age", () => {
      const first = TOWN_BIRTH_RATES_BY_AGE.find(([, rate]) => rate > 0)![0];
      expect(MINIMUM_PARENT_AGE_AT_BIRTH).toBe(first);
      expect(YOUNGEST_AGE_AT_BIRTH).toBe(first);
    });

    it("in all 56 places, the youngest mothers the table allows are recorded and the world goes on", () => {
      // Before the fix the table started at 15 and the writer at 16, so a
      // 15-year-old's draw stopped watched worlds in Seattle and Philadelphia
      // ("would be under 16 at the birth").
      const places = onePlaceEach();
      expect(places).toHaveLength(56);
      let births = 0;
      for (const placeKey of places) {
        const { world, town, women, parentAges } = reviewAtAge(
          placeKey,
          `youngest-${placeKey}`,
          MINIMUM_PARENT_AGE_AT_BIRTH,
          4,
        );
        expect(
          familyEvents(world, town).filter(
            (event) => event.type === TOWN_FAMILY_EVENTS.birthRefused,
          ),
          placeKey,
        ).toEqual([]);
        births += parentAges.length;
        for (const age of parentAges)
          expect(age, placeKey).toBeGreaterThanOrEqual(
            MINIMUM_PARENT_AGE_AT_BIRTH,
          );
        expect(women.length, placeKey).toBeGreaterThan(0);
      }
      expect(births).toBeGreaterThan(0);
    });

    it("nobody younger than the table's first age is ever drawn", () => {
      const { world, town } = reviewAtAge(
        BOISE,
        "families-too-young",
        MINIMUM_PARENT_AGE_AT_BIRTH - 1,
        QUARTERS,
      );
      expect(
        familyEvents(world, town).filter(
          (event) =>
            event.type === "life.family-member-added" ||
            event.type === TOWN_FAMILY_EVENTS.birthRefused,
        ),
      ).toEqual([]);
    });
  },
);
