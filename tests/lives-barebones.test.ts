import { describe, expect, it } from "vitest";

import { smallWorld } from "./fixtures/small-world";
import { composeWorldTimeHandlers } from "../src/simulation/campaigns";
import { ageOnDate, addDays, makeIsoDate } from "../src/simulation/dates";
import { resolveFutureDueItemsThrough } from "../src/simulation/future-transitions";
import {
  createHousehold,
  createOrganization,
  createPartnership,
  createWorkRelationship,
  recordHouseholdLocation,
  recordWorkStatus,
  startHouseholdMembership,
} from "../src/simulation/life";
import {
  activeEducationEnrollmentsAt,
  activeWorkRelationshipsAt,
  householdMembershipsAt,
  workStatusAt,
} from "../src/simulation/life-queries";
import { lifePlaceStateIdentities } from "../src/simulation/life-places";
import {
  recordedMoves,
  reviewQuarter,
  reviewTown,
} from "../src/simulation/migration";
import { personName } from "../src/simulation/people";
import { childrenOf } from "../src/simulation/people-family";
import {
  FAMILY_INTENTION_ANSWERED_EVENT,
  familyPlanAvailability,
  familyPlans,
  proposeFamilyPlan,
} from "../src/simulation/people-family-plan";
import { upbringingFor } from "../src/simulation/people-upbringing";
import { SeededRng, pickDistinct } from "../src/simulation/rng";
import { TOWN_JOB_END_REASONS } from "../src/simulation/living-world/town-labor-market";
import type { EntityId, World } from "../src/simulation/types";
import { assertWorldIntegrity } from "../src/simulation/world";

/**
 * LIVES slice step 0: the barebones play script. Four steps, one case each,
 * each reading what a player would see from recorded facts only, on a small
 * world (tests/fixtures/small-world.ts) in one place drawn from all 56 by the
 * seed. No year runs, no opening life. Where a step's producer does not exist
 * yet the case is a todo that names it.
 */
const SEED = "lives-barebones-20261001";
const [state] = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  1,
);
const PLACE = state!.jurisdictionKey;

function world(people = 4) {
  return smallWorld({ place: PLACE, seed: SEED, people });
}

const provenance = (note: string) => ({ kind: "authored" as const, note });

describe(`LIVES barebones script in ${PLACE} (seed ${SEED})`, () => {
  it("step 1: reads the player's own childhood record as it exists today", () => {
    const small = world();
    const record = upbringingFor(small.world, small.personId);
    expect(record.personId).toBe(small.personId);
    // Early childhood and adolescence each carry a family-money level and the
    // source it came from, so the player can be told where it comes from.
    expect(record.money.map((row) => row.period).sort()).toEqual([
      "adolescence",
      "early-childhood",
    ]);
    for (const row of record.money) expect(row.source.note).not.toBe("");
    expect(["stable", "some-moves", "disrupted"]).toContain(
      record.homeStability,
    );
    // The same person in the same world reads the same record, and reading
    // writes nothing.
    expect(upbringingFor(small.world, small.personId)).toEqual(record);
    // Enrollments are read from recorded facts; a small world records none.
    expect(
      activeEducationEnrollmentsAt(small.world, small.personId),
    ).toBeInstanceOf(Array);
    assertWorldIntegrity(small.world);
  });
  it.todo(
    "step 1b: the full childhood record (coverage spells, school years, moves) - producer: claude/team5-childhood-record",
  );

  it("step 2: a child is born to named parents through the family-plan path", () => {
    const small = world(6);
    const [first, second] = small.world.personOrder
      .filter(
        (id) =>
          ageOnDate(
            small.world.people[id]!.birthDate,
            small.world.currentDate,
          ) >= 21,
      )
      .slice(0, 2) as [EntityId, EntityId];
    expect(first && second, "two adult residents").toBeTruthy();
    let next: World = createHousehold(small.world, {
      stableKey: "lives:household",
      formedAt: small.world.currentDate,
      label: "Fixture household for the two parents",
      provenance: provenance("LIVES barebones fixture household."),
    });
    const householdId = next.history.households.at(-1)!.id;
    next = recordHouseholdLocation(next, {
      stableKey: "lives:household-location",
      householdId,
      effectiveAt: next.currentDate,
      jurisdictionId: next.people[first]!.homeJurisdictionId,
      label: "Fixture residence",
      kind: "residence:community-base",
      provenance: provenance("LIVES barebones fixture residence."),
      supersedesLocationId: null,
    });
    for (const personId of [first, second])
      next = startHouseholdMembership(next, {
        stableKey: `lives:membership:${personId}`,
        personId,
        householdId,
        startedAt: next.currentDate,
        residenceRole: "primary",
        kind: "resident:member",
        provenance: provenance("LIVES barebones fixture membership."),
      });
    next = createPartnership(next, {
      stableKey: "lives:partnership",
      personIds: [first, second].sort() as [EntityId, EntityId],
      kind: "legal:marriage",
      startedAt: addDays(next.currentDate, -400),
      provenance: provenance("LIVES barebones fixture partnership."),
    });
    expect(familyPlanAvailability(next, first).available).toBe(true);
    const raised = proposeFamilyPlan(next, { personId: first, kind: "birth" });
    // The partner answers for themselves on the due date, then the arrival
    // lands on its own recorded day: only due items run, not a year.
    const answeredAt = addDays(raised.currentDate, 5);
    const answered = resolveFutureDueItemsThrough(
      raised,
      answeredAt,
      composeWorldTimeHandlers(),
    );
    const answer = answered.history.events.filter(
      (event) => event.type === FAMILY_INTENTION_ANSWERED_EVENT,
    );
    expect(answer).toHaveLength(1);
    const plan = familyPlans(answered, first)[0]!;
    // The recorded answer is the outcome whichever way the couple decided.
    expect(["agreed", "not-now"]).toContain(plan.answer);
    if (plan.answer === "not-now") {
      expect(childrenOf(answered, first)).toEqual([]);
      return;
    }
    const born = resolveFutureDueItemsThrough(
      answered,
      makeIsoDate(plan.resolvesOn!),
      composeWorldTimeHandlers(),
    );
    const [childId] = childrenOf(born, first);
    expect(childId, "a child is on record").toBeDefined();
    const parents = [first, second].map((id) => personName(born.people[id]!));
    const child = born.people[childId!]!;
    expect(personName(child)).not.toBe("");
    expect(parents.every((name) => name !== "")).toBe(true);
    expect(child.homeJurisdictionId).toBe(
      born.people[first]!.homeJurisdictionId,
    );
    expect(childrenOf(born, second)).toContain(childId);
    expect(householdMembershipsAt(born, childId!).length).toBeGreaterThan(0);
    assertWorldIntegrity(born);
  });

  it("step 3: a resident's job loss is on record, and what their view of the official has to go on", () => {
    const small = world();
    const workerId = small.world.personOrder[1]!;
    let next = createOrganization(small.world, {
      stableKey: "lives:employer",
      formedAt: small.world.currentDate,
      provenance: provenance("LIVES barebones fixture employer."),
      initialProfile: {
        name: "Fixture Employer",
        classification: "custom:fixture-employer",
        locationJurisdictionId: small.jurisdictionId,
      },
    });
    const organizationId = next.history.organizations.at(-1)!.id;
    next = createWorkRelationship(next, {
      stableKey: "lives:job",
      personId: workerId,
      organizationId,
      startedAt: addDays(next.currentDate, -60),
      kind: "employment:staff",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: provenance("LIVES barebones fixture job."),
      initialRole: {
        title: "Fixture worker",
        occupationClassification: "service:fixture",
        locationJurisdictionId: small.jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 32, maximumHours: 40 },
          attention: "high",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: small.jurisdictionId,
        },
      },
    });
    const job = next.history.workRelationships.at(-1)!;
    const working = workStatusAt(next, job.id)!;
    expect(working.status).toBe("active");
    const later = next.currentDate;
    next = recordWorkStatus(next, {
      stableKey: "lives:job-lost",
      workRelationshipId: job.id,
      effectiveAt: later,
      status: "ended",
      reason: TOWN_JOB_END_REASONS.laidOff,
      provenance: provenance(
        "LIVES barebones fixture layoff, written through the work-status writer.",
      ),
      supersedesStatusId: working.id,
    });
    const lost = workStatusAt(next, job.id)!;
    expect(lost.status).toBe("ended");
    expect(lost.reason).toBe("labor:laid-off");
    // Before the loss the record still reads as working: history is appended.
    expect(
      workStatusAt(next, job.id, {
        asOfDate: addDays(later, -1),
        historySequenceExclusive: lost.sequence,
      })!.status,
    ).toBe("active");
    assertWorldIntegrity(next);
  });
  it.todo(
    "step 3b: the person's view of the responsible official shifts from the lived job loss - producer: lived-outcome factors for evaluatePoliticalBeliefFormation, on claude/team5-belief-lived-outcomes (today a caller must hand it factors; nothing reads a recorded layoff)",
  );

  it("step 4a: a household moves away after a job offer elsewhere (A135)", () => {
    // No employer elsewhere is seated ahead: the place the worker looks to
    // writes the one the offer needs from its own business counts.
    const small = world(6);
    const today = small.world.currentDate;
    const adults = small.world.personOrder
      .filter(
        (id) =>
          id !== small.personId &&
          small.world.people[id]!.homeJurisdictionId === small.jurisdictionId &&
          ageOnDate(small.world.people[id]!.birthDate, today) >= 18,
      )
      .sort(
        (a, b) =>
          small.world.people[b]!.birthDate.localeCompare(
            small.world.people[a]!.birthDate,
          ) || a.localeCompare(b),
      );
    const [worker, partner] = adults as [EntityId, EntityId];
    expect(worker && partner, "two adult residents").toBeTruthy();

    // A couple's household, and the worker's town job, lost 200 days ago:
    // each written through the life writers, as steps 2 and 3 write theirs.
    let next: World = createHousehold(small.world, {
      stableKey: "lives:4a:household",
      formedAt: today,
      label: "Fixture household for the couple",
      provenance: provenance("LIVES barebones fixture household."),
    });
    const householdId = next.history.households.at(-1)!.id;
    next = recordHouseholdLocation(next, {
      stableKey: "lives:4a:household-location",
      householdId,
      effectiveAt: today,
      jurisdictionId: small.jurisdictionId,
      label: "Fixture residence",
      kind: "residence:community-base",
      provenance: provenance("LIVES barebones fixture residence."),
      supersedesLocationId: null,
    });
    for (const personId of [worker, partner])
      next = startHouseholdMembership(next, {
        stableKey: `lives:4a:membership:${personId}`,
        personId,
        householdId,
        startedAt: today,
        residenceRole: "primary",
        kind: "resident:member",
        provenance: provenance("LIVES barebones fixture membership."),
      });
    next = createPartnership(next, {
      stableKey: "lives:4a:partnership",
      personIds: [worker, partner].sort() as [EntityId, EntityId],
      kind: "legal:marriage",
      startedAt: addDays(today, -400),
      provenance: provenance("LIVES barebones fixture partnership."),
    });
    next = createOrganization(next, {
      stableKey: "lives:4a:employer",
      formedAt: addDays(today, -500),
      provenance: provenance("LIVES barebones fixture employer."),
      initialProfile: {
        name: "Fixture Employer",
        classification: "custom:fixture-employer",
        locationJurisdictionId: small.jurisdictionId,
      },
    });
    next = createWorkRelationship(next, {
      stableKey: "lives:4a:job",
      personId: worker,
      organizationId: next.history.organizations.at(-1)!.id,
      startedAt: addDays(today, -400),
      kind: "employment:staff",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: provenance("LIVES barebones fixture job."),
      initialRole: {
        title: "Fixture worker",
        occupationClassification: "service:fixture",
        locationJurisdictionId: small.jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 32, maximumHours: 40 },
          attention: "high",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: small.jurisdictionId,
        },
      },
    });
    const job = next.history.workRelationships.at(-1)!;
    next = recordWorkStatus(next, {
      stableKey: "lives:4a:job-lost",
      workRelationshipId: job.id,
      effectiveAt: addDays(today, -200),
      status: "ended",
      reason: TOWN_JOB_END_REASONS.laidOff,
      provenance: provenance("LIVES barebones fixture layoff."),
      supersedesStatusId: workStatusAt(next, job.id)!.id,
    });

    // The worker's own quarterly review: they weigh looking elsewhere, the
    // state's office answers through the job market, and they weigh the
    // offer against what holds them, all from the record.
    const moved = reviewTown(next, reviewQuarter(worker), {
      arrivalsPerResidentPerYear: 0,
    });
    const offered = moved.history.events.find(
      (event) =>
        event.type === "job-market.offered" &&
        event.participants.some((row) => row.personId === worker),
    );
    expect(
      offered,
      "an offer from a recorded employer elsewhere",
    ).toBeDefined();
    const move = recordedMoves(moved).find((row) =>
      row.personIds.includes(worker),
    );
    expect(move, "the worker's household moved").toBeDefined();
    // The move is recorded under its strongest cause. Losing the job and the
    // offer weigh the same here, and the tie goes to the lost job; the
    // household still goes where the offer is.
    expect(["work:job-offer", "work:job-lost"]).toContain(move!.reason);
    expect(move!.personIds).toEqual(expect.arrayContaining([worker, partner]));
    const opening = moved.history.jobOpenings!.find(
      (row) =>
        row.stableKey.startsWith("job-opening:elsewhere:") &&
        row.stableKey.includes(worker),
    )!;
    expect(move!.toJurisdictionId).toBe(opening.jurisdictionId);
    expect(move!.toJurisdictionId).not.toBe(small.jurisdictionId);
    // The employer is a private business recorded at that place, not a
    // government office.
    const employerRecord = moved.history.organizations.find(
      (row) => row.id === opening.organizationId,
    )!;
    expect(employerRecord.stableKey).toMatch(/^employer-elsewhere:/);
    for (const personId of [worker, partner])
      expect(moved.people[personId]!.homeJurisdictionId).toBe(
        move!.toJurisdictionId,
      );
    // Having moved to the offer's place, the worker took it and started there.
    const allSteps = moved.history.jobApplicationSteps ?? [];
    const applicationId = allSteps.find(
      (step) => step.eventId === offered!.id,
    )!.applicationId;
    expect(
      allSteps
        .filter((step) => step.applicationId === applicationId)
        .map((step) => step.kind),
    ).toEqual(["offered", "accepted", "started"]);
    const application = moved.history.jobApplications!.find(
      (row) => row.id === applicationId,
    )!;
    const employer = moved.history.jobOpenings!.find(
      (opening) => opening.id === application.openingId,
    )!.organizationId;
    expect(
      activeWorkRelationshipsAt(moved, worker).some(
        (row) => row.relationship.organizationId === employer,
      ),
    ).toBe(true);
    console.info(
      `LIVES 4a ${PLACE} (seed ${SEED}): ${offered!.summary} Moved ${move!.personIds.length} under "${move!.reason}".`,
    );
    assertWorldIntegrity(moved);
  });
  it.todo(
    "step 4b: a death from a recorded cause (A130) - the producer exists (crisis/mortality.ts) but a death arrives only when a person's own mortality threshold is crossed, which on a small world takes a multi-year run",
  );
});
