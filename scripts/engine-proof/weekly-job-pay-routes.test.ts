import { describe, expect, it } from "vitest";
import { addDays, ageOnDate, daysBetween } from "../../src/simulation/dates";
import { createScenarioWorld } from "../../src/simulation/demo";
import { requireLifePlace } from "../../src/simulation/life-places";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
} from "../../src/simulation/life";
import {
  activeWorkRelationshipsAt,
  workStatusAt,
} from "../../src/simulation/life-queries";
import {
  createResourceFlow,
  createResourcePosition,
  createWorkCompensation,
  money,
} from "../../src/simulation/resources";
import { resourceFlowTermsAt } from "../../src/simulation/resource-queries";
import {
  advanceApplications,
  answerJobOffer,
  applyForJob,
  applicationsFor,
  latestApplicationStep,
  openJobListings,
  openWeeklyListings,
  startJob,
} from "../../src/simulation/job-market";
import { advanceWorld, assertWorldIntegrity } from "../../src/simulation/world";
import { advanceWorldMinutes } from "../../src/simulation/time-work";
import {
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation/serialization";
import {
  ensureSavedWeeklyJobPayCalendar,
  WEEKLY_JOB_PAY_TRANSITION_KEY,
} from "../../src/simulation/weekly-job-pay-transitions";
import type { World } from "../../src/simulation/types";

const provenance = {
  kind: "authored" as const,
  note: "Controlled saved employer, staff-pay and cash fixture; not ordinary business wealth or a natural hiring choice.",
};

function fixture(seed: string) {
  const place = requireLifePlace("3137000");
  const base = createScenarioWorld(seed, place.context, { peopleCount: 8 });
  const adults = base.personOrder.filter(
    (id) =>
      ageOnDate(base.people[id]!.birthDate, base.currentDate) >= 21 &&
      !activeWorkRelationshipsAt(base, id).some(
        (row) =>
          row.relationship.kind.startsWith("employment:") &&
          row.relationship.compensation === "paid",
      ),
  );
  expect(adults.length).toBeGreaterThanOrEqual(2);
  const personId = adults[0]!,
    staffId = adults[1]!;
  let world = createOrganization(
    { ...base, control: { kind: "person", personId } },
    {
      stableKey: "a8:employer",
      formedAt: base.currentDate,
      provenance,
      initialProfile: {
        name: "A8 controlled retail employer",
        classification: "enterprise:retail",
        locationJurisdictionId: place.context.jurisdiction.id,
      },
    },
  );
  const organizationId = world.history.organizations.at(-1)!.id;
  world = createResourcePosition(world, {
    stableKey: "a8:employer:cash",
    owner: { kind: "organization", organizationId },
    openedAt: world.currentDate,
    openingBalance: money(10_000_000, "USD"),
    provenance,
  });
  const role = {
    title: "Cashier",
    occupationClassification: "occupation:cashier" as const,
    locationJurisdictionId: place.context.jurisdiction.id,
    timeDemand: {
      expectedWeekly: { minimumHours: 40, maximumHours: 40 },
      attention: "moderate" as const,
      concurrency: "mostly-exclusive" as const,
      scheduleRigidity: "rigid" as const,
      interruptibility: "limited" as const,
      locationJurisdictionId: place.context.jurisdiction.id,
    },
  };
  return { world, personId, staffId, organizationId, role };
}

function jobContract(
  f: ReturnType<typeof fixture>,
  initialStatus: "active" | "expected" = "active",
  startsAt = f.world.currentDate,
) {
  let world = createWorkRelationship(f.world, {
    stableKey: "a8:saved-job",
    personId: f.personId,
    organizationId: f.organizationId,
    startedAt: startsAt,
    initialStatus,
    kind: "employment:staff",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: f.role,
  });
  const work = world.history.workRelationships.at(-1)!;
  if (initialStatus === "expected")
    world = advanceWorld(world, daysBetween(world.currentDate, startsAt));
  world = createWorkCompensation(world, {
    stableKey: `job-pay:${work.id}`,
    workRelationshipId: work.id,
    startsAt,
    amount: money(40_000, "USD"),
    cadenceKind: "schedule:weekly",
    restrictionKind: null,
    jurisdictionId: null,
    provenance,
  });
  const flow = world.history.resourceFlows.at(-1)!;
  return { ...f, world, work, flow };
}

function jobItems(world: World, flowId: string) {
  return world.history.futureDueItems.filter(
    (row) =>
      row.transitionKey === WEEKLY_JOB_PAY_TRANSITION_KEY &&
      row.provenance.kind === "simulated" &&
      row.provenance.sourceEntityIds.includes(flowId),
  );
}

function verifyPaid(
  world: World,
  flowId: string,
  startsAt: World["currentDate"],
) {
  const outcomes = world.history.resourceTransferOutcomes.filter(
    (row) => row.resourceFlowId === flowId,
  );
  expect(outcomes).toHaveLength(1);
  expect(outcomes[0]!.status).toBe("completed");
  expect(outcomes[0]!.periodStartsAt).toBe(startsAt);
  expect(outcomes[0]!.periodEndsAt).toBe(addDays(startsAt, 6));
  expect(outcomes[0]!.occurredAt).toBe(addDays(startsAt, 7));
  expect(outcomes[0]!.transferredAmount.minorUnits).toBe(40_000);
  assertWorldIntegrity(world);
}

describe("A8 saved weekly jobs on the ordinary clock", () => {
  it("admits an opening contract once and pays through default minute handlers after Continue", () => {
    const f = jobContract(fixture("a8:opening-clock"));
    const scheduled = ensureSavedWeeklyJobPayCalendar(f.world);
    expect(jobItems(scheduled, f.flow.id)).toHaveLength(1);
    expect(ensureSavedWeeklyJobPayCalendar(scheduled)).toBe(scheduled);
    const loaded = deserializeWorld(serializeWorld(scheduled));
    expect(ensureSavedWeeklyJobPayCalendar(loaded)).toBe(loaded);
    const paid = advanceWorldMinutes(loaded, 7 * 24 * 60);
    verifyPaid(paid, f.flow.id, f.flow.startsAt);
    const replay = advanceWorldMinutes(scheduled, 7 * 24 * 60);
    expect(serializeWorld(replay)).toBe(serializeWorld(paid));
    expect(ensureSavedWeeklyJobPayCalendar(paid)).toBe(paid);
    expect(jobItems(paid, f.flow.id)).toHaveLength(2);
  });

  it("schedules current-date activation after saved work status and pays without a presentation refresh", () => {
    const start = fixture("a8:activation-clock");
    const f = jobContract(
      start,
      "expected",
      addDays(start.world.currentDate, 1),
    );
    expect(ensureSavedWeeklyJobPayCalendar(f.world)).toBe(f.world);
    expect(jobItems(f.world, f.flow.id)).toHaveLength(0);
    const ready = f.world;
    const active = recordWorkStatus(ready, {
      stableKey: "a8:activate",
      workRelationshipId: f.work.id,
      effectiveAt: ready.currentDate,
      status: "active",
      reason: null,
      supersedesStatusId: workStatusAt(ready, f.work.id)!.id,
      provenance,
    });
    expect(jobItems(active, f.flow.id)).toHaveLength(1);
    const loaded = deserializeWorld(serializeWorld(active));
    expect(ensureSavedWeeklyJobPayCalendar(loaded)).toBe(loaded);
    verifyPaid(advanceWorld(loaded, 7), f.flow.id, f.flow.startsAt);
  });

  it("starts a later hire from its saved offer and pays the new contract through the ordinary clock", () => {
    const f = fixture("a8:later-hire-clock");
    let world = advanceWorld(f.world, 1);
    world = createWorkRelationship(world, {
      stableKey: "a8:shop-staff",
      personId: f.staffId,
      organizationId: f.organizationId,
      startedAt: world.currentDate,
      kind: "employment:local-business",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: f.role,
    });
    world = createResourceFlow(world, {
      stableKey: "a8:staff-pay",
      source: { kind: "organization", organizationId: f.organizationId },
      recipient: { kind: "person", personId: f.staffId },
      startsAt: world.currentDate,
      amount: money(280_000, "USD"),
      cadenceKind: "schedule:monthly",
      basisKind: "compensation:wages",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: null,
      provenance,
    });
    world = openWeeklyListings(world, f.personId);
    const opening = openJobListings(world, f.personId).find(
      (row) => row.organizationId === f.organizationId,
    )!;
    expect(opening).toBeDefined();
    const applied = applyForJob(world, f.personId, opening.id);
    expect(applied.ok).toBe(true);
    const application = applicationsFor(applied.world, f.personId).find(
      (row) => row.openingId === opening.id,
    )!;
    world = advanceApplications(
      advanceWorld(
        applied.world,
        daysBetween(applied.world.currentDate, application.decisionAt),
      ),
      f.personId,
    );
    const offer = latestApplicationStep(world, application.id)!;
    expect(offer.kind, JSON.stringify(offer)).toBe("offered");
    const accepted = answerJobOffer(world, application.id, true);
    expect(accepted.ok).toBe(true);
    world = advanceWorld(
      accepted.world,
      daysBetween(accepted.world.currentDate, offer.startAt!),
    );
    const started = startJob(world, application.id);
    expect(started.ok).toBe(true);
    const work = started.world.history.workRelationships.find(
      (row) => row.stableKey === `${application.stableKey}:work`,
    )!;
    expect(work.organizationId).toBe(f.organizationId);
    const flow = started.world.history.resourceFlows.find(
      (row) => row.stableKey === `job-pay:${work.id}`,
    )!;
    expect(jobItems(started.world, flow.id)).toHaveLength(1);
    expect(ensureSavedWeeklyJobPayCalendar(started.world)).toBe(started.world);
    const loaded = deserializeWorld(serializeWorld(started.world));
    expect(ensureSavedWeeklyJobPayCalendar(loaded)).toBe(loaded);
    const paid = advanceWorld(loaded, 7);
    const outcomes = paid.history.resourceTransferOutcomes.filter(
      (row) => row.resourceFlowId === flow.id,
    );
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]!.status).toBe("completed");
    expect(outcomes[0]!.transferredAmount.minorUnits).toBe(
      resourceFlowTermsAt(started.world, flow.id)!.amount.minorUnits,
    );
    expect(outcomes[0]!.occurredAt).toBe(addDays(flow.startsAt, 7));
    expect(serializeWorld(advanceWorld(started.world, 7))).toBe(
      serializeWorld(paid),
    );
    expect(startJob(paid, application.id).ok).toBe(false);
    expect(ensureSavedWeeklyJobPayCalendar(paid)).toBe(paid);
    console.info("A8_LATER_HIRE", {
      person: `${paid.people[f.personId]!.givenName} ${paid.people[f.personId]!.familyName}`,
      employer: f.organizationId,
      work: work.id,
      flow: flow.id,
      hiredOn: flow.startsAt,
      paidOn: paid.currentDate,
      transferredMinor: outcomes[0]!.transferredAmount.minorUnits,
    });
    assertWorldIntegrity(paid);
  });

  it("refuses an overdue unscheduled week without backdating or skipping its earned period", () => {
    const f = fixture("a8:overdue-clock");
    const later = advanceWorld(f.world, 8);
    const dated = jobContract(
      { ...f, world: later },
      "active",
      f.world.currentDate,
    );
    expect(jobItems(dated.world, dated.flow.id)).toHaveLength(0);
    expect(ensureSavedWeeklyJobPayCalendar(dated.world)).toBe(dated.world);
    const loaded = deserializeWorld(serializeWorld(dated.world));
    expect(ensureSavedWeeklyJobPayCalendar(loaded)).toBe(loaded);
    const next = advanceWorld(loaded, 1);
    expect(jobItems(next, dated.flow.id)).toHaveLength(0);
    expect(
      next.history.resourceTransferOutcomes.filter(
        (row) => row.resourceFlowId === dated.flow.id,
      ),
    ).toHaveLength(0);
  });
});
