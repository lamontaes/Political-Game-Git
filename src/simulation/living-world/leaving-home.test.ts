import { describe, expect, it } from "vitest";
import {
  observerSetup,
  openObserverWorld,
} from "../../presentation/observer-world";
import { ageOnDate } from "../dates";
import { householdLocationAt, householdMembershipsAt } from "../life-queries";
import { causeReader, decideToLeave } from "../migration/causes";
import { migrationTown, moverDepartureRate } from "../migration/review";
import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import { ensurePeopleTraits } from "../people-traits";
import { SeededRng } from "../rng";
import { TERRITORY_PLACE_ROWS } from "../territory-places";
import type { EntityId, World } from "../types";
import {
  decideToLeaveHome,
  LEAVING_HOME_EVENT,
  leavingHomeConsiderations,
  UNRESEARCHED_LEAVING_HOME,
  type LeavingHomeFacts,
} from "./leaving-home";
import { reviewTownFamilies } from "./town-families";
import { activeDwellingOccupanciesAt } from "../resource-queries";
import { reviewTownHomes } from "./town-homes";

const LONG = 60_000;

/**
 * Share of young adults living in a parent's home (Census Bureau, Current
 * Population Survey, "Living Arrangements Varied Across Age Groups", May
 * 2024, 2022 figures; men and women averaged). They check the town's totals;
 * they never decide one person.
 */
const CPS_AT_HOME = { "18-24": 0.56, "25-34": 0.155 } as const;

/** The largest place of each state and D.C., Honolulu, and one per territory. */
function allPlaces(): readonly string[] {
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

const PLACE_SEED = "a135-new-household";
const PLACES = allPlaces();
const PLACE = PLACES[new SeededRng(PLACE_SEED).integer(0, PLACES.length)]!;

/** Grown children (18 and over) who live in a household with a parent. */
function grownAtHome(world: World, town: EntityId): EntityId[] {
  const homeOf = (id: EntityId) =>
    householdMembershipsAt(world, id).find(
      (entry) => entry.state.residenceRole === "primary",
    )?.household.id ?? null;
  const found: EntityId[] = [];
  for (const id of [...world.personOrder].sort()) {
    const person = world.people[id]!;
    if (person.homeJurisdictionId !== town) continue;
    if (ageOnDate(person.birthDate, world.currentDate) < 18) continue;
    const home = homeOf(id);
    if (!home) continue;
    const parentHere = world.history.kinshipRelationships.some((row) => {
      if (!/parent-child$/.test(row.kind) || !row.personIds.includes(id))
        return false;
      const other = row.personIds.find((x) => x !== id)!;
      return (
        world.people[other]!.birthDate < person.birthDate &&
        homeOf(other) === home
      );
    });
    if (parentHere) found.push(id);
  }
  return found;
}

function band(age: number): keyof typeof CPS_AT_HOME | null {
  if (age >= 18 && age <= 24) return "18-24";
  if (age >= 25 && age <= 34) return "25-34";
  return null;
}

describe(`a new household forms only from a recorded cause (place ${PLACE}, place seed ${PLACE_SEED})`, () => {
  const opened = openObserverWorld(observerSetup(PLACE_SEED, PLACE)).world;
  const town = migrationTown(opened)!;

  it("the weights are marked as unresearched placeholders", () => {
    expect(UNRESEARCHED_LEAVING_HOME.provenance).toBe(
      "unresearched-blanket-rule",
    );
    expect(UNRESEARCHED_LEAVING_HOME.researchQuestions).toContain(
      "why-young-adults-leave-home",
    );
  });

  it(
    "age, pay against the rent and a partner slide the weighing; no pay holds them home",
    () => {
      const person = opened.personOrder.find(
        (id) =>
          opened.people[id]!.homeJurisdictionId === town &&
          ageOnDate(opened.people[id]!.birthDate, opened.currentDate) >= 18,
      )!;
      const lean = (facts: LeavingHomeFacts) =>
        leavingHomeConsiderations(opened, person, facts, "test").reduce(
          (sum, row) =>
            sum +
            (row.optionKey === "own-home" ? 1 : -1) *
              ({ slight: 1, moderate: 2, strong: 4, decisive: 6 }[
                row.importance
              ] *
                { low: 1, medium: 2, high: 3 }[row.confidence]),
          0,
        );
      const base: LeavingHomeFacts = {
        age: 22,
        payMinor: 300_000,
        rentForOneMinor: 120_000,
        partnerElsewhere: false,
      };
      expect(lean({ ...base, age: 29 })).toBeGreaterThan(lean(base));
      expect(lean({ ...base, payMinor: 500_000 })).toBeGreaterThan(lean(base));
      expect(lean({ ...base, partnerElsewhere: true })).toBeGreaterThan(
        lean(base),
      );
      expect(lean({ ...base, payMinor: 0 })).toBeLessThan(lean(base));
      // With no pay of their own, even at 30 they stay.
      expect(
        decideToLeaveHome(
          opened,
          person,
          { ...base, age: 30, payMinor: 0 },
          "t",
        ).leaves,
      ).toBe(false);
    },
    LONG,
  );

  it(
    "grown children decide in a watched quarter; each one who leaves forms a household in town, which the homes review then houses",
    () => {
      const before = grownAtHome(opened, town);
      const reviewed = reviewTownFamilies(opened, town, null, "a135-test");
      const left = reviewed.history.events.filter(
        (event) => event.type === LEAVING_HOME_EVENT,
      );
      const after = new Set(grownAtHome(reviewed, town));
      const shares: Record<string, { grown: number; atHome: number }> = {};
      for (const id of before) {
        const key = band(
          ageOnDate(opened.people[id]!.birthDate, opened.currentDate),
        );
        if (!key) continue;
        shares[key] ??= { grown: 0, atHome: 0 };
        shares[key].grown += 1;
        if (after.has(id)) shares[key].atHome += 1;
      }
      console.info(
        `A135 ${PLACE}: ${before.length} grown children at home, ${left.length} left; by age`,
        shares,
      );
      for (const event of left) {
        const id = event.participants[0]!.personId;
        expect(before).toContain(id);
        expect(after.has(id)).toBe(false);
        const home = householdMembershipsAt(reviewed, id).find(
          (entry) => entry.state.residenceRole === "primary",
        )!;
        expect(home.membership.startedAt).toBe(reviewed.currentDate);
        expect(
          householdLocationAt(reviewed, home.household.id)?.jurisdictionId,
        ).toBe(town);
      }
      // The same review again writes nothing new.
      expect(reviewTownFamilies(reviewed, town, null, "a135-test")).toBe(
        reviewed,
      );
      if (left.length > 0) {
        const housed = reviewTownHomes(reviewed, town, "a135-test");
        for (const event of left) {
          const id = event.participants[0]!.personId;
          const household = householdMembershipsAt(housed, id).find(
            (entry) => entry.state.residenceRole === "primary",
          )!.household.id;
          expect(
            activeDwellingOccupanciesAt(housed, housed.currentDate).some(
              (row) =>
                row.occupant.kind === "household" &&
                row.occupant.householdId === household,
            ),
          ).toBe(true);
        }
      }
    },
    LONG,
  );
});
