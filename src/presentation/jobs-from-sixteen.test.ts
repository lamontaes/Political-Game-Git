import { describe, expect, it } from "vitest";
import { ageOnDate } from "../simulation";
import type { EntityId, World } from "../simulation/types";
import {
  FULL_TIME_APPLICANT_AGE,
  MINIMUM_APPLICANT_AGE,
  applicationBlocked,
  jobSearchArea,
  openJobListings,
  openingSuitsYoungApplicant,
} from "../simulation/job-market";
import { createExplicitGeographyLife } from "./new-game-geography";
import { letTimePass } from "./formative-play";
import { projectJobMarket } from "./job-listings-view";

/**
 * The town's job market opens at sixteen, not eighteen.
 *
 * It already took applicants from sixteen, but the growing-up clock never ran
 * it, so a sixteen-year-old saw no listings until adulthood. From sixteen the
 * listings now arrive on that clock, limited to ordinary part-time hourly
 * work; full-time and salaried work still waits for eighteen. A
 * fifteen-year-old sees none.
 */

const RENO = "3260600";
const HOUMA = "2236255";

function youth(placeKey: string, seed: string, startAge: 15 | 16) {
  const life = createExplicitGeographyLife({
    placeKey,
    seed,
    startAge,
    depth: "play-formative-years",
  });
  return { world: life.game.world, personId: life.game.playerPersonId };
}

function age(world: World, personId: EntityId): number {
  return ageOnDate(world.people[personId]!.birthDate, world.currentDate);
}

/** Growing-up steps until the market lists something, while still under 18. */
function untilListed(world: World, personId: EntityId, steps = 8): World {
  let next = world;
  for (let step = 0; step < steps; step += 1) {
    if (openJobListings(next, personId).length > 0) return next;
    if (age(next, personId) >= FULL_TIME_APPLICANT_AGE) return next;
    next = letTimePass(next, personId);
  }
  return next;
}

function openingsInArea(world: World, personId: EntityId) {
  const area = jobSearchArea(world, personId);
  return (world.history.jobOpenings ?? []).filter(
    (opening) =>
      area.has(opening.jurisdictionId) && opening.closesAt >= world.currentDate,
  );
}

describe("jobs from sixteen", () => {
  it("lists part-time hourly work to a sixteen-year-old, in two places", () => {
    for (const [place, seed] of [
      [RENO, "jobs16-reno"],
      [HOUMA, "jobs16-houma"],
    ] as const) {
      const start = youth(place, seed, 16);
      expect(age(start.world, start.personId)).toBe(MINIMUM_APPLICANT_AGE);
      const world = untilListed(start.world, start.personId);
      expect(age(world, start.personId), place).toBeLessThan(
        FULL_TIME_APPLICANT_AGE,
      );
      const listed = openJobListings(world, start.personId);
      expect(listed.length, place).toBeGreaterThan(0);
      for (const opening of listed) {
        expect(openingSuitsYoungApplicant(opening), place).toBe(true);
        expect(opening.pay.basis).not.toBe("annual-salary");
        expect(applicationBlocked(world, start.personId, opening.id)).toBe(
          null,
        );
      }
      // Anything full-time or salaried that the town opened is not shown,
      // and asking for it is refused with the age it waits for.
      for (const opening of openingsInArea(world, start.personId)) {
        if (openingSuitsYoungApplicant(opening)) continue;
        expect(listed).not.toContain(opening);
        expect(applicationBlocked(world, start.personId, opening.id)).toMatch(
          /from age 18/,
        );
      }
      expect(
        projectJobMarket(world, start.personId).listings.length,
      ).toBeGreaterThan(0);
    }
  });

  it("lists nothing to a fifteen-year-old", () => {
    const start = youth(RENO, "jobs15-reno", 15);
    let world = start.world;
    for (let step = 0; step < 6; step += 1) {
      if (age(world, start.personId) >= MINIMUM_APPLICANT_AGE) break;
      expect(openJobListings(world, start.personId)).toEqual([]);
      expect(projectJobMarket(world, start.personId).listings).toEqual([]);
      world = letTimePass(world, start.personId);
    }
    expect(openJobListings(start.world, start.personId)).toEqual([]);
  });

  it("calls part-time hourly work suitable and full-time or salaried work not", () => {
    const base = {
      id: "o",
      stableKey: "k",
      sequence: 1,
      organizationId: "org",
      jurisdictionId: "j",
      title: "Clerk",
      occupationClassification: null,
      schedule: null,
      qualifications: null,
      earliestStartAt: null,
      opensAt: "2026-01-01",
      closesAt: "2026-01-20",
      provenance: { kind: "authored", note: "test" },
    } as const;
    const hourly = { basis: "hourly", amount: { minor: 900, currency: "USD" } };
    const partTime = { minimumHours: 16, maximumHours: 22 };
    const fullTime = { minimumHours: 37, maximumHours: 40 };
    const opening = (pay: unknown, weeklyHours: unknown) =>
      ({ ...base, pay, weeklyHours }) as unknown as Parameters<
        typeof openingSuitsYoungApplicant
      >[0];
    expect(openingSuitsYoungApplicant(opening(hourly, partTime))).toBe(true);
    expect(openingSuitsYoungApplicant(opening(hourly, fullTime))).toBe(false);
    expect(
      openingSuitsYoungApplicant(
        opening({ ...hourly, basis: "annual-salary" }, partTime),
      ),
    ).toBe(false);
  });
});
