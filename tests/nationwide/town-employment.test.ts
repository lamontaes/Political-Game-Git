import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import { ageOnDate } from "../../src/simulation/dates";
import {
  activeWorkRelationshipsAt,
  householdMembershipsAt,
  organizationProfileAt,
  peopleInHouseholdAt,
} from "../../src/simulation/life-queries";
import {
  TOWN_JOB_END_REASONS,
  reviewTownJobs,
} from "../../src/simulation/living-world/town-labor-market";
import {
  moveTieReader,
  relocateHousehold,
} from "../../src/simulation/migration/relocate";
import {
  lifePlaceByKey,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { recordPersonDeath } from "../../src/simulation/vitality";
import {
  TOWN_EMPLOYMENT_VERSION,
  describeTownEmployment,
  ensureTownEmployment,
  townEmploymentMix,
  townWorkplaceWeights,
} from "../../src/simulation/living-world/town-employment";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import type { EntityId, World } from "../../src/simulation";

const LEXINGTON = "2146027";
const FRANKFORT = "2128900";
const BELZONI = "2805140";
const COLUMBUS = "3918000";
const URBAN_HONOLULU = "1571550";

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

/** The largest place of every state and D.C., and Honolulu for Hawaii. */
function onePlacePerState(): readonly string[] {
  const largest = new Map<string, [string, number]>();
  for (const pair of PLACE_POPULATION_ROWS.split(";")) {
    const [geoid, people] = pair.split(":") as [string, string];
    const state = geoid.slice(0, 2);
    if ((largest.get(state)?.[1] ?? -1) < Number(people))
      largest.set(state, [geoid, Number(people)]);
  }
  largest.set("15", [URBAN_HONOLULU, 0]);
  return [...largest.values()].map(([geoid]) => geoid).sort();
}

function townJobs(world: World, town: EntityId) {
  return world.personOrder.flatMap((personId) =>
    world.people[personId]!.homeJurisdictionId === town
      ? activeWorkRelationshipsAt(world, personId).map((job) => ({
          personId,
          job,
          employer: organizationProfileAt(
            world,
            job.relationship.organizationId!,
          )!,
        }))
      : [],
  );
}

describe("every state sizes a town's jobs from its own data", () => {
  it("covers all 50 states and D.C. through one code path", () => {
    const places = onePlacePerState();
    expect(places).toHaveLength(51);
    for (const geoid of places) {
      const place = lifePlaceByKey(geoid)!;
      expect(place, geoid).toBeTruthy();
      const town = place.context.jurisdiction.id;
      const mix = townEmploymentMix(town);
      // Connecticut's places are not joined to its new planning regions, so
      // it reads its whole state (the #701 report names the gap).
      expect(mix.basis, place.displayName).toBe(
        geoid.startsWith("09") ? "state" : "county",
      );
      const weights = townWorkplaceWeights(town);
      for (const key of ["retail", "hospital", "public-school", "post-office"])
        expect(
          weights.get(key) ?? 0,
          `${place.displayName} ${key}`,
        ).toBeGreaterThan(0);
    }
  });

  it("differs between rural Mississippi and Columbus, Ohio", () => {
    const share = (geoid: string, key: string) => {
      const weights = townWorkplaceWeights(
        lifePlaceByKey(geoid)!.context.jurisdiction.id,
      );
      const total = [...weights.values()].reduce((a, b) => a + b, 0);
      return (weights.get(key) ?? 0) / total;
    };
    expect(share(BELZONI, "farm")).toBeGreaterThan(share(COLUMBUS, "farm"));
    expect(share(COLUMBUS, "professional")).toBeGreaterThan(
      share(BELZONI, "professional"),
    );
  });
});

describe("a new game's town is at work", { timeout: 180_000 }, () => {
  it.each([
    ["Lexington, Kentucky", LEXINGTON],
    ["Frankfort, Kentucky", FRANKFORT],
    ["Belzoni, Mississippi", BELZONI],
    ["Columbus, Ohio", COLUMBUS],
  ])("%s: most working-age residents hold a real job", (_, placeKey) => {
    const { world, personId, town } = openAt(placeKey, `jobs-${placeKey}`);
    const summary = describeTownEmployment(world, town, personId);
    expect(summary.workingAge).toBeGreaterThan(40);
    expect(summary.employed / summary.workingAge).toBeGreaterThanOrEqual(0.8);

    const jobs = townJobs(world, town);
    for (const { personId: worker, job, employer } of jobs) {
      // A title, an occupation, a workplace in town and weekly hours.
      expect(job.role.title.length).toBeGreaterThan(0);
      expect(employer.locationJurisdictionId).toBe(town);
      expect(job.role.timeDemand.expectedWeekly.maximumHours).toBeGreaterThan(
        0,
      );
      if (job.relationship.stableKey.startsWith(TOWN_EMPLOYMENT_VERSION))
        expect(job.role.occupationClassification).not.toBeNull();
      expect(
        ageOnDate(world.people[worker]!.birthDate, world.currentDate),
      ).toBeGreaterThanOrEqual(18);
    }
    // The player chooses their own work.
    expect(
      jobs.some(
        ({ personId: worker, job }) =>
          worker === personId &&
          job.relationship.stableKey.startsWith(TOWN_EMPLOYMENT_VERSION),
      ),
    ).toBe(false);

    // The people a political life runs through hold those jobs.
    const titles = new Set(jobs.map(({ job }) => job.role.title));
    for (const title of [
      "City clerk",
      "City planner",
      "Principal",
      "Pastor",
      "Community organizer",
      "Union representative",
      "Registered nurse",
      "Police officer",
      "Firefighter",
      "Party office manager",
      "Campaign field organizer",
    ])
      expect(titles, title).toContain(title);
    const pastors = jobs.filter(({ job }) => job.role.title === "Pastor");
    const congregations = new Set(
      pastors.map(({ job }) => job.relationship.organizationId),
    );
    expect(congregations.size).toBe(pastors.length);
    for (const { employer } of pastors)
      expect(employer.classification).toBe("community:congregation");

    // Filling the town's jobs again changes nothing.
    expect(ensureTownEmployment(world, town, personId)).toBe(world);
  });
});

describe("the town's jobs change hands", { timeout: 180_000 }, () => {
  const opened = openAt(LEXINGTON, "jobs-turnover");

  it("quits, layoffs and hires are dated records, and a round runs once", () => {
    const { world, personId, town } = opened;
    let next = world;
    for (let round = 0; round < 8; round += 1)
      next = reviewTownJobs(next, town, personId, `test-${round}`);
    const ended = next.history.workStatuses.filter(
      (row) =>
        row.status === "ended" &&
        row.stableKey.startsWith(TOWN_EMPLOYMENT_VERSION),
    );
    const reasons = new Set(ended.map((row) => row.reason));
    expect(reasons).toContain(TOWN_JOB_END_REASONS.quit);
    expect(reasons).toContain(TOWN_JOB_END_REASONS.laidOff);
    for (const row of ended) expect(row.effectiveAt).toBe(next.currentDate);
    const hired = next.history.workRelationships.filter(
      (row) =>
        row.stableKey.startsWith(`${TOWN_EMPLOYMENT_VERSION}:${town}:job:`) &&
        row.stableKey.includes(":test-"),
    );
    expect(hired.length).toBeGreaterThan(0);
    for (const job of hired) expect(job.startedAt).toBe(next.currentDate);
    // Nobody holds two town jobs at once, and the player is never hired.
    const holders = townJobs(next, town)
      .filter(({ job }) =>
        job.relationship.stableKey.startsWith(TOWN_EMPLOYMENT_VERSION),
      )
      .map(({ personId: worker }) => worker);
    expect(new Set(holders).size).toBe(holders.length);
    expect(holders).not.toContain(personId);
    // Most of the town is still at work.
    const summary = describeTownEmployment(next, town, personId);
    expect(summary.employed / summary.workingAge).toBeGreaterThanOrEqual(0.8);
    // The same round again writes nothing.
    expect(reviewTownJobs(next, town, personId, "test-7")).toBe(next);
  });

  it("a worker who dies leaves the job", () => {
    const { world, personId, town } = opened;
    const [worker] = townJobs(world, town).filter(({ job }) =>
      job.relationship.stableKey.startsWith(TOWN_EMPLOYMENT_VERSION),
    );
    const died = recordPersonDeath(world, {
      stableKey: "town-employment-test:death",
      personId: worker!.personId,
      diedAt: world.currentDate,
      causeKey: "cause:town-employment-fixture",
      sourceEntityIds: [world.id],
      summary: "Died; the cause is not recorded.",
      provenance: { kind: "authored", note: "Town employment fixture." },
    });
    const next = reviewTownJobs(died, town, personId, "ending");
    const ended = next.history.workStatuses.find(
      (row) =>
        row.workRelationshipId === worker!.job.relationship.id &&
        row.status === "ended",
    );
    expect(ended?.reason).toBe(TOWN_JOB_END_REASONS.died);
  });

  it("moving away ends a town job instead of blocking the move", () => {
    const { world, town } = opened;
    const reader = moveTieReader(world);
    const mover = townJobs(world, town).find(
      ({ personId: worker, job }) =>
        job.relationship.stableKey.startsWith(TOWN_EMPLOYMENT_VERSION) &&
        householdMembershipsAt(world, worker)[0] !== undefined &&
        peopleInHouseholdAt(
          world,
          householdMembershipsAt(world, worker)[0]!.household.id,
        ).every((id) => !reader.bindingTie(id) && !reader.housingTie(id)),
    );
    expect(mover).toBeDefined();
    const destination = stateJurisdictionForKey("US-OR")!.id;
    const moved = relocateHousehold(world, {
      stableKey: "town-employment-test:move",
      personId: mover!.personId,
      toJurisdictionId: destination,
      reason: "life-course:unrecorded",
      waveKey: null,
    });
    expect(activeWorkRelationshipsAt(moved, mover!.personId)).toHaveLength(0);
    const ended = moved.history.workStatuses.find(
      (row) =>
        row.workRelationshipId === mover!.job.relationship.id &&
        row.status === "ended",
    );
    expect(ended?.reason).toBe("labor:moved-away");
  });
});
