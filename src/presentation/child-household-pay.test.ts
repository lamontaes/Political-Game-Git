import { describe, expect, it } from "vitest";

import {
  activeChildAuthoritiesAt,
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import { addDays } from "../simulation/dates";
import { createOrganization, createWorkRelationship, recordWorkStatus } from "../simulation/life";
import { householdMembershipsAt, workStatusAt } from "../simulation/life-queries";
import { resourcePositionAt } from "../simulation/resource-queries";
import { settleHouseholdAdultJobPay } from "../simulation/job-market";
import {
  createResourceFlow,
  createResourcePosition,
  createWorkCompensation,
  money,
  recordResourceTransferOutcome,
  recordWorkCompensationTerms,
} from "../simulation/resources";
import type { EntityId, World } from "../simulation/types";
import { createExplicitGeographyLife } from "./new-game-geography";
import { passOrdinaryDays } from "./ordinary-life";

const TEST_PROVENANCE = { kind: "authored" as const, note: "child household pay test" };

function childLife(placeKey: string, seed: string) {
  const life = createExplicitGeographyLife({
    placeKey,
    seed,
    startAge: 6,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
  });
  const personId = life.game.playerPersonId;
  const authority = activeChildAuthoritiesAt(life.game.world, personId).find(
    (row) => row.authority.holder.kind === "person",
  );
  if (authority?.authority.holder.kind !== "person")
    throw new Error("A child test needs a recorded guardian");
  const adultId = authority.authority.holder.personId;
  const household = householdMembershipsAt(life.game.world, personId).find(
    (row) => row.state.residenceRole === "primary",
  );
  if (!household) throw new Error("A child test needs a recorded household");
  return { world: life.game.world, personId, adultId, householdId: household.household.id };
}

function giveRecordedJob(
  world: World,
  adultId: EntityId,
  weeklyMinor: number,
  startedAt = world.currentDate,
): {
  world: World;
  workId: EntityId;
  flowId: EntityId;
} {
  let next = createOrganization(world, {
    stableKey: `child-pay:${adultId}:employer`,
    formedAt: startedAt,
    provenance: TEST_PROVENANCE,
    initialProfile: {
      name: "Test employer",
      classification: "enterprise:retail",
      locationJurisdictionId: world.people[adultId]!.homeJurisdictionId,
    },
  });
  const employerId = next.history.organizations.at(-1)!.id;
  next = createWorkRelationship(next, {
    stableKey: `child-pay:${adultId}:work`,
    personId: adultId,
    organizationId: employerId,
    startedAt,
    kind: "employment:local-business",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: TEST_PROVENANCE,
    initialRole: {
      title: "Clerk",
      occupationClassification: "occupation:office-clerk",
      locationJurisdictionId: world.people[adultId]!.homeJurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 30, maximumHours: 40 },
        attention: "moderate",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: world.people[adultId]!.homeJurisdictionId,
      },
    },
  });
  const workId = next.history.workRelationships.at(-1)!.id;
  next = createWorkCompensation(next, {
    stableKey: `child-pay:${adultId}:wages`,
    workRelationshipId: workId,
    startsAt: startedAt,
    amount: money(weeklyMinor, "USD"),
    cadenceKind: "schedule:weekly",
    restrictionKind: null,
    jurisdictionId: null,
    provenance: TEST_PROVENANCE,
  });
  return { world: next, workId, flowId: next.history.resourceFlows.at(-1)!.id };
}

function days(world: World, count: number): World {
  let next = world;
  for (let day = 0; day < count; day += 1)
    next = passOrdinaryDays(next, 1);
  return next;
}

describe("recorded adult work in a child household", () => {
  it("settles two different saved wages on the child's clock without pooling them", () => {
    for (const [placeKey, seed, weeklyMinor] of [
      ["3223500", "child-pay-ely", 80_000],
      ["2236255", "child-pay-houma", 135_000],
    ] as const) {
      const child = childLife(placeKey, seed);
      let world = createResourcePosition(child.world, {
        stableKey: `${seed}:household-money`,
        owner: { kind: "household", householdId: child.householdId },
        openedAt: child.world.currentDate,
        openingBalance: money(0, "USD"),
        provenance: TEST_PROVENANCE,
      });
      const job = giveRecordedJob(world, child.adultId, weeklyMinor);
      world = days(job.world, 7);
      expect(world.history.resourceTransferOutcomes.filter(
        (row) => row.resourceFlowId === job.flowId,
      )).toHaveLength(1);
      expect(resourcePositionAt(world, { kind: "person", personId: child.adultId }, "USD")?.liquidBalance.minorUnits).toBe(weeklyMinor);
      expect(resourcePositionAt(world, { kind: "household", householdId: child.householdId }, "USD")?.liquidBalance.minorUnits).toBe(0);
      const reloaded = deserializeWorld(serializeWorld(world));
      const repeated = settleHouseholdAdultJobPay(reloaded, child.personId, reloaded.currentDate);
      expect(repeated.history.resourceTransferOutcomes).toEqual(reloaded.history.resourceTransferOutcomes);
      assertWorldIntegrity(reloaded);
    }
  });

  it("changes wages at recorded terms, ends them with the job, and requires an explicit household transfer", () => {
    const child = childLife("3223500", "child-pay-change");
    let world = createResourcePosition(child.world, {
      stableKey: "child-pay-change:household-money",
      owner: { kind: "household", householdId: child.householdId },
      openedAt: child.world.currentDate,
      openingBalance: money(0, "USD"),
      provenance: TEST_PROVENANCE,
    });
    const job = giveRecordedJob(world, child.adultId, 80_000);
    const startedAt = world.currentDate;
    world = days(job.world, 7);
    const previousTerms = world.history.resourceFlowTerms.find(
      (row) => row.resourceFlowId === job.flowId,
    )!;
    world = recordWorkCompensationTerms(world, {
      stableKey: "child-pay-change:raise",
      workRelationshipId: job.workId,
      effectiveAt: world.currentDate,
      status: "active",
      amount: money(100_000, "USD"),
      cadenceKind: "schedule:weekly",
      reason: "Employer changed the recorded weekly pay.",
      provenance: TEST_PROVENANCE,
      supersedesTermsId: previousTerms.id,
    });
    world = days(world, 7);
    expect(world.history.resourceTransferOutcomes.filter(
      (row) => row.resourceFlowId === job.flowId,
    ).map((row) => row.transferredAmount.minorUnits)).toEqual([80_000, 100_000]);
    const status = workStatusAt(world, job.workId)!;
    world = recordWorkStatus(world, {
      stableKey: "child-pay-change:job-ended",
      workRelationshipId: job.workId,
      effectiveAt: world.currentDate,
      status: "ended",
      reason: "The job ended.",
      provenance: TEST_PROVENANCE,
      supersedesStatusId: status.id,
    });
    world = days(deserializeWorld(serializeWorld(world)), 7);
    expect(world.history.resourceTransferOutcomes.filter(
      (row) => row.resourceFlowId === job.flowId,
    )).toHaveLength(2);
    expect(resourcePositionAt(world, { kind: "household", householdId: child.householdId }, "USD")?.liquidBalance.minorUnits).toBe(0);

    world = createResourceFlow(world, {
      stableKey: "child-pay-change:household-contribution",
      source: { kind: "person", personId: child.adultId },
      recipient: { kind: "household", householdId: child.householdId },
      startsAt: world.currentDate,
      amount: money(50_000, "USD"),
      cadenceKind: "schedule:weekly",
      basisKind: "support:household-contribution",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: null,
      provenance: TEST_PROVENANCE,
    });
    const contribution = world.history.resourceFlows.at(-1)!;
    world = recordResourceTransferOutcome(world, {
      stableKey: "child-pay-change:contribution-paid",
      resourceFlowId: contribution.id,
      periodStartsAt: world.currentDate,
      periodEndsAt: world.currentDate,
      occurredAt: world.currentDate,
      status: "completed",
      attemptedAmount: money(50_000, "USD"),
      transferredAmount: money(50_000, "USD"),
      reasonKind: null,
      note: null,
      provenance: TEST_PROVENANCE,
    });
    expect(resourcePositionAt(world, { kind: "household", householdId: child.householdId }, "USD")?.liquidBalance.minorUnits).toBe(50_000);
    expect(resourcePositionAt(world, { kind: "person", personId: child.adultId }, "USD")?.liquidBalance.minorUnits).toBe(130_000);
    expect(world.currentDate).toBe(addDays(startedAt, 21));
    assertWorldIntegrity(deserializeWorld(serializeWorld(world)));
  });

  it("does not backfill years of unplayed wages when an old recorded job first enters the child's clock", () => {
    const child = childLife("3223500", "child-pay-old-job");
    const oldStart = addDays(child.world.currentDate, -28);
    const job = giveRecordedJob(child.world, child.adultId, 75_000, oldStart);
    const later = days(job.world, 7);
    const paid = later.history.resourceTransferOutcomes.filter(
      (row) => row.resourceFlowId === job.flowId,
    );
    expect(paid).toHaveLength(1);
    expect(paid[0]!.occurredAt).toBe(later.currentDate);
    expect(resourcePositionAt(later, { kind: "person", personId: child.adultId }, "USD")?.liquidBalance.minorUnits).toBe(75_000);
  });

  it("does not infer work, pay, or a child's knowledge from an unknown livelihood", () => {
    const child = childLife("2236255", "child-pay-unknown");
    const priorKnowledge = child.world.history.knowledge.filter(
      (row) => row.personId === child.personId,
    );
    const later = days(child.world, 7);
    expect(later.history.resourceTransferOutcomes.filter((row) =>
      row.resourceFlowId &&
      later.history.resourceFlows.find((flow) => flow.id === row.resourceFlowId)?.basisReference.kind === "work",
    )).toHaveLength(0);
    expect(later.history.knowledge.filter((row) => row.personId === child.personId)).toEqual(priorKnowledge);
  });

  it("does not tell the child about a recorded adult job loss it has not learned", () => {
    const child = childLife("2236255", "child-pay-unheard-loss");
    const job = giveRecordedJob(child.world, child.adultId, 90_000);
    const status = workStatusAt(job.world, job.workId)!;
    const ended = recordWorkStatus(job.world, {
      stableKey: "child-pay-unheard-loss:ended",
      workRelationshipId: job.workId,
      effectiveAt: job.world.currentDate,
      status: "ended",
      reason: "The employer closed this position.",
      provenance: TEST_PROVENANCE,
      supersedesStatusId: status.id,
    });
    const priorChildKnowledge = ended.history.knowledge.filter(
      (row) => row.personId === child.personId,
    );
    const later = days(ended, 7);
    expect(later.history.resourceTransferOutcomes.filter(
      (row) => row.resourceFlowId === job.flowId,
    )).toHaveLength(0);
    expect(later.history.knowledge.filter(
      (row) => row.personId === child.personId,
    )).toEqual(priorChildKnowledge);
  });
});
