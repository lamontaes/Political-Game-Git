import { describe, expect, it } from "vitest";
import { assertWorldIntegrity } from "../simulation";
import { leaveJob } from "../simulation/job-market";
import {
  activeWorkRelationshipsAt,
  organizationProfileAt,
  workRoleAt,
  workStatusAt,
} from "../simulation/life-queries";
import {
  adultStartEmployer,
  recordedAdultEmployerMonthlyWage,
} from "../simulation/recorded-adult-employer";
import { townBusinesses } from "../simulation/living-world/town-businesses";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { observerPlace } from "./observer-world";
import { letAdultTimePass } from "./adult-life";
import { openOrdinaryLife } from "./ordinary-life";

/**
 * A grown-up New Game used to open between jobs: nine of nine starts at
 * thirty-four that Build 7 played, from North Dakota to the Virgin Islands,
 * read "You do not hold a job or an office right now". Each run here draws
 * its town from all 56 places and names it with the seed.
 */

function adultLife(seed: string) {
  const place = observerPlace(seed);
  const life = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: place.key,
      seed,
      startAge: 34,
      questionnaire: "skipped",
    }),
  );
  expect(life.game).not.toBeNull();
  const world = life.game!.world;
  const personId = life.game!.playerPersonId;
  const home = world.people[personId]!.homeJurisdictionId;
  const openingWork = activeWorkRelationshipsAt(world, personId);
  const context =
    openingWork.length > 0
      ? ""
      : JSON.stringify({
          currentDate: world.currentDate,
          selected: adultStartEmployer(world, personId, home),
          pastWork: world.history.workRelationships
            .filter((work) => work.personId === personId)
            .map((work) => ({
              stableKey: work.stableKey,
              startedAt: work.startedAt,
              status: workStatusAt(world, work.id),
            })),
          employers: townBusinesses(world, home).map((business) => ({
            name: business.name,
            staff: business.jobs.map((job) => {
              const role = workRoleAt(world, job.relationshipId);
              return {
                directsOthers: job.directsOthers,
                occupation: role?.occupationClassification,
                monthlyWage: role?.occupationClassification
                  ? recordedAdultEmployerMonthlyWage(
                      {
                        workerOccupation: role.occupationClassification,
                      },
                      home,
                    )
                  : null,
              };
            }),
          })),
        });
  return {
    label: `${place.key} seed ${seed} ${context}`,
    world,
    personId,
  };
}

describe("a grown-up new life", () => {
  it("opens holding a job at a business in their own town", () => {
    for (const seed of ["adult-work-1", "adult-work-2", "adult-work-3"]) {
      const { label, world, personId } = adultLife(seed);
      const jobs = activeWorkRelationshipsAt(world, personId);
      expect(jobs, label).toHaveLength(1);
      const job = jobs[0]!;
      const home = world.people[personId]!.homeJurisdictionId;
      expect(
        townBusinesses(world, home).map((b) => b.organizationId),
        label,
      ).toContain(job.relationship.organizationId);
      const employer = world.history.organizations.find(
        (record) => record.id === job.relationship.organizationId,
      )!;
      // The actual town employer opened on the saved opening date.
      expect(job.relationship.startedAt, label).toBe(employer.formedAt);
      expect(job.relationship.startedAt <= world.currentDate, label).toBe(true);
      expect(
        organizationProfileAt(world, job.relationship.organizationId!)?.name,
        label,
      ).toBeTruthy();
      assertWorldIntegrity(world);
    }
  });

  it("works where the person's own record points, not the oldest business", () => {
    const { label, world, personId } = adultLife("adult-work-2");
    const home = world.people[personId]!.homeJurisdictionId;
    const chosen = adultStartEmployer(world, personId, home);
    const held = activeWorkRelationshipsAt(world, personId)[0]!;
    expect(chosen?.organization.id, label).toBe(
      held.relationship.organizationId,
    );
    const role = workRoleAt(world, held.relationship.id)!;
    expect(chosen?.kind.workerOccupation, label).toBe(
      role.occupationClassification,
    );
    expect(chosen?.kind.workerTitle, label).toBe(role.title);
    expect(
      townBusinesses(world, home).some((business) =>
        business.jobs.some((staff) => {
          if (staff.personId === personId || staff.directsOthers) return false;
          const staffRole = workRoleAt(world, staff.relationshipId);
          return (
            staffRole?.title === role.title &&
            staffRole.occupationClassification === role.occupationClassification
          );
        }),
      ),
      label,
    ).toBe(true);
  });

  it("is paid each week by the employer, and can leave the job", () => {
    const { label, world, personId } = adultLife("adult-work-3");
    const openingJobs = activeWorkRelationshipsAt(world, personId);
    expect(openingJobs, label).toHaveLength(1);
    const job = openingJobs[0]!;
    const played = openOrdinaryLife(world, personId);
    // The player's own "let time pass".
    const later = letAdultTimePass(played, 21);
    const pay = later.history.resourceFlows.find(
      (flow) =>
        flow.basisReference.kind === "work" &&
        flow.basisReference.workRelationshipId === job.relationship.id,
    );
    expect(pay, label).toBeDefined();
    const paid = later.history.resourceTransferOutcomes.filter(
      (outcome) =>
        outcome.resourceFlowId === pay!.id &&
        outcome.transferredAmount.minorUnits > 0,
    );
    expect(paid.length, label).toBeGreaterThanOrEqual(2);
    const left = leaveJob(later, job.relationship.id);
    expect(left.ok, label).toBe(true);
    expect(activeWorkRelationshipsAt(left.world, personId)).toEqual([]);
    assertWorldIntegrity(left.world);
  });
});
