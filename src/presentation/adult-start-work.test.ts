import { describe, expect, it } from "vitest";
import { assertWorldIntegrity } from "../simulation";
import { leaveJob } from "../simulation/job-market";
import {
  activeWorkRelationshipsAt,
  organizationProfileAt,
} from "../simulation/life-queries";
import { adultStartEmployer } from "../simulation/recorded-adult-employer";
import { townBusinesses } from "../simulation/living-world/town-businesses";
import { createExplicitGeographyLife } from "./new-game-geography";
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
  const life = createExplicitGeographyLife({
    placeKey: place.key,
    seed,
    startAge: 34,
  });
  return {
    label: `${place.key} seed ${seed}`,
    world: life.game.world,
    personId: life.game.playerPersonId,
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
      expect(job.relationship.startedAt < world.currentDate, label).toBe(true);
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
    // Nobody the person knows works in town, so their school job's line
    // (a shop counter) decides: they work a counter, not a trade.
    expect(chosen?.kind.workerOccupation.startsWith("occupation:"), label).toBe(
      true,
    );
  });

  it("is paid each week by the employer, and can leave the job", () => {
    const { label, world, personId } = adultLife("adult-work-3");
    const played = openOrdinaryLife(world, personId);
    // The player's own "let time pass".
    const later = letAdultTimePass(played, 21);
    const job = activeWorkRelationshipsAt(later, personId)[0]!;
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
