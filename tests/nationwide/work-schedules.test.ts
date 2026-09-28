import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import { backdropPlaces } from "../../src/presentation/place-backdrops";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  activeWorkRelationshipsAt,
  organizationProfileAt,
} from "../../src/simulation/life-queries";
import { lifePlaceByKey } from "../../src/simulation/life-places";
import {
  TOWN_WORKPLACES,
  countyDisplayName,
  townWorkplaceWeights,
} from "../../src/simulation/living-world/town-employment";
import {
  WORKPLACE_PATTERN,
  WORKPLACE_PLACE,
  onShiftAt,
  peopleAtWorkAt,
  whereaboutsAt,
  workSchedulesFor,
  type WorkSchedule,
} from "../../src/simulation/living-world/work-schedules";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import type { EntityId, IsoDate, World } from "../../src/simulation";

const LEXINGTON = "2146027";
const BELZONI = "2805140";
const COLUMBUS = "3918000";
const SAN_JUAN = "7276770";

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
  largest.set("72", [SAN_JUAN, 0]);
  for (const [key, , usps] of TERRITORY_PLACE_ROWS)
    if (!largest.has(usps)) largest.set(usps, [key, 0]);
  return [...largest.values()].map(([key]) => key).sort();
}

/** A local moment on the first `weekday` (0 is Sunday) on or after `from`. */
function at(world: World, from: IsoDate, weekday: number, minute: number) {
  let date = from;
  while (new Date(`${date}T12:00:00Z`).getUTCDay() !== weekday)
    date = addDays(date, 1);
  return {
    ...simulationMomentOnLocalDate(world.currentMoment, date),
    minuteOfDay: minute,
  };
}

function townWorkers(world: World, town: EntityId) {
  return world.personOrder.filter(
    (id) =>
      world.people[id]!.homeJurisdictionId === town &&
      activeWorkRelationshipsAt(world, id).length > 0,
  );
}

describe("every job's working week comes from one rule", () => {
  it("gives every workplace in all 50 states, D.C. and the 5 territories a place picture", () => {
    const places = onePlaceEach();
    expect(places).toHaveLength(56);
    const pictures = new Set(backdropPlaces());
    for (const key of places) {
      const place = lifePlaceByKey(key);
      expect(place, key).toBeDefined();
      const weights = townWorkplaceWeights(place!.context.jurisdiction.id);
      expect(weights.size, key).toBeGreaterThan(0);
      for (const [workplace, weight] of weights) {
        if (weight <= 0) continue;
        expect(
          WORKPLACE_PATTERN[workplace],
          `${key} ${workplace}`,
        ).toBeDefined();
        expect(
          pictures.has(WORKPLACE_PLACE[workplace]!),
          `${key} ${workplace}`,
        ).toBe(true);
      }
    }
    for (const workplace of TOWN_WORKPLACES) {
      expect(WORKPLACE_PATTERN[workplace.key], workplace.key).toBeDefined();
      expect(pictures.has(WORKPLACE_PLACE[workplace.key]!), workplace.key).toBe(
        true,
      );
    }
    // Every workplace the towns can write has a picture that exists.
    const world = openAt(LEXINGTON, "schedules-pictures").world;
    for (const personId of world.personOrder)
      for (const schedule of workSchedulesFor(world, personId))
        expect(pictures.has(schedule.place), schedule.place).toBe(true);
    expect(TOWN_WORKPLACES.length).toBeGreaterThan(30);
  });
});

describe("people are at work on their shifts", { timeout: 180_000 }, () => {
  const lexington = openAt(LEXINGTON, "schedules-lexington");
  const { world, town } = lexington;

  it("the city clerk is at the counter on a weekday morning, and not at night", () => {
    const morning = at(world, world.currentDate, 2, 10 * 60);
    const night = at(world, world.currentDate, 2, 21 * 60);
    const counter = peopleAtWorkAt(world, town, "clerk-counter", morning);
    expect(counter.map((person) => person.title)).toContain("City clerk");
    expect(peopleAtWorkAt(world, town, "clerk-counter", night)).toHaveLength(0);
    const clerk = counter.find((person) => person.title === "City clerk")!;
    expect(whereaboutsAt(world, clerk.personId, morning).kind).toBe("work");
    expect(whereaboutsAt(world, clerk.personId, night).kind).toBe("home");
  });

  it("the diner, the hospital and the union hall are staffed by day", () => {
    for (const weekday of [1, 2, 3, 4, 5]) {
      const morning = at(world, world.currentDate, weekday, 10 * 60);
      for (const place of ["diner", "hospital-hallway", "union-hall"])
        expect(
          peopleAtWorkAt(world, town, place, morning).length,
          `${place} on day ${weekday}`,
        ).toBeGreaterThan(0);
      const night = at(world, world.currentDate, weekday, 21 * 60);
      expect(peopleAtWorkAt(world, town, "union-hall", night)).toHaveLength(0);
    }
  });

  it("a shift past midnight is still on the next morning", () => {
    const date = world.currentDate;
    const night: WorkSchedule = {
      workRelationshipId: "work_test" as EntityId,
      pattern: "hospital",
      partTime: false,
      shift: { startMinute: 19 * 60, minutes: 12 * 60 },
      weeklyHours: 36,
      place: "hospital-hallway",
      organizationId: null,
      worksOn: (day) => day === date,
    };
    const local = (day: IsoDate, minute: number) => ({
      ...simulationMomentOnLocalDate(world.currentMoment, day),
      minuteOfDay: minute,
    });
    expect(onShiftAt(night, local(date, 18 * 60))).toBe(false);
    expect(onShiftAt(night, local(date, 20 * 60))).toBe(true);
    expect(onShiftAt(night, local(addDays(date, 1), 3 * 60))).toBe(true);
    expect(onShiftAt(night, local(addDays(date, 1), 7 * 60))).toBe(false);
  });

  it("scheduled hours follow each job's recorded weekly hours", () => {
    for (const id of townWorkers(world, town))
      for (const schedule of workSchedulesFor(world, id)) {
        if (schedule.pattern === "fire") continue;
        const job = activeWorkRelationshipsAt(world, id).find(
          (active) => active.relationship.id === schedule.workRelationshipId,
        )!;
        const { minimumHours, maximumHours } =
          job.role.timeDemand.expectedWeekly;
        expect(schedule.weeklyHours, job.role.title).toBeGreaterThanOrEqual(
          minimumHours - 8,
        );
        expect(schedule.weeklyHours, job.role.title).toBeLessThanOrEqual(
          maximumHours + 6,
        );
      }
  });

  it("the same job has the same hours when asked again", () => {
    const [someone] = townWorkers(world, town);
    const first = workSchedulesFor(world, someone!);
    const again = workSchedulesFor(
      { ...world, history: { ...world.history } },
      someone!,
    );
    expect(
      again.map((schedule) => [schedule.shift, schedule.weeklyHours]),
    ).toEqual(first.map((schedule) => [schedule.shift, schedule.weeklyHours]));
  });
});

describe("some jobs are part-time", { timeout: 300_000 }, () => {
  it("some workers in three towns, and never a civic role", () => {
    let all = 0;
    let part = 0;
    for (const placeKey of [LEXINGTON, BELZONI, COLUMBUS]) {
      const { world, town } = openAt(placeKey, `schedules-${placeKey}`);
      const schedules = townWorkers(world, town).flatMap((id) =>
        workSchedulesFor(world, id),
      );
      const partTime = schedules.filter((schedule) => schedule.partTime);
      expect(partTime.length / schedules.length, placeKey).toBeLessThan(0.35);
      all += schedules.length;
      part += partTime.length;
      for (const id of townWorkers(world, town))
        for (const job of activeWorkRelationshipsAt(world, id))
          if (/City clerk|City planner|Principal/.test(job.role.title))
            expect(
              job.role.timeDemand.expectedWeekly.maximumHours,
            ).toBeGreaterThanOrEqual(35);
    }
    expect(part / all).toBeGreaterThan(0.04);
    expect(part / all).toBeLessThan(0.25);
  });
});

describe(
  "a town in a county has the county clerk's office",
  { timeout: 180_000 },
  () => {
    it("names counties as people say them", () => {
      expect(countyDisplayName("COUNTY OF HUMPHREYS")).toBe("Humphreys County");
      expect(countyDisplayName("PARISH OF EAST BATON ROUGE")).toBe(
        "East Baton Rouge Parish",
      );
      expect(countyDisplayName("CITY AND COUNTY OF DENVER")).toBe(
        "Denver City and County",
      );
    });

    it("Belzoni's county clerk works the counter on a weekday", () => {
      const { world, town } = openAt(BELZONI, "schedules-county-clerk");
      const morning = at(world, world.currentDate, 3, 10 * 60);
      const clerk = peopleAtWorkAt(world, town, "clerk-counter", morning).find(
        (person) => person.title === "County clerk",
      );
      expect(clerk).toBeDefined();
      expect(organizationProfileAt(world, clerk!.organizationId!)?.name).toBe(
        "Humphreys County Clerk's Office",
      );
      const night = at(world, world.currentDate, 3, 21 * 60);
      expect(whereaboutsAt(world, clerk!.personId, night).kind).toBe("home");
    });

    it("a town with no county government, such as Lexington, has none", () => {
      const { world, town } = openAt(LEXINGTON, "schedules-no-county");
      const titles = townWorkers(world, town).flatMap((id) =>
        activeWorkRelationshipsAt(world, id).map((job) => job.role.title),
      );
      expect(titles).toContain("City clerk");
      expect(titles).not.toContain("County clerk");
    });
  },
);
