import { describe, expect, it } from "vitest";

import { smallWorld } from "./fixtures/small-world";
import { composeWorldTimeHandlers } from "../src/simulation/campaigns";
import { childhoodRecord } from "../src/simulation/childhood-record-queries";
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
  householdMembershipsAt,
  workStatusAt,
} from "../src/simulation/life-queries";
import { lifePlaceStateIdentities } from "../src/simulation/life-places";
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
import { createCharacterHistoryContextPerson } from "../src/simulation/character-history";
import {
  DEATH_CAUSE_ILLNESS_WITH_COURSE,
  FATAL_ILLNESS_EPISODE_PREFIX,
} from "../src/simulation/crisis/death-causes";
import { ensureCrisisMortality } from "../src/simulation/crisis/mortality";
import { crisisRecords } from "../src/simulation/crisis/records";

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
  it("step 1b: reads the player's childhood record: the span on record, eligible days and entries", () => {
    const small = world();
    const record = childhoodRecord(small.world, small.personId)!;
    expect(record.personId).toBe(small.personId);
    expect(
      record.witnessedFrom <= record.witnessedThrough ||
        record.yearsWitnessed === 0,
    ).toBe(true);
    // Every entry cites a record the World holds.
    for (const entry of record.entries)
      expect(
        small.world.history.events.some(
          (event) => event.id === entry.sourceRecordId,
        ),
      ).toBe(true);
    expect(record.daysEligibleForCoverage).toBeGreaterThanOrEqual(0);
    expect(childhoodRecord(small.world, small.personId)).toEqual(record);
  });

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
    // The birth is the first line of the child's childhood record.
    expect(childhoodRecord(born, childId!)!.entries).toEqual([
      expect.objectContaining({
        kind: "birth",
        birthDate: child.birthDate,
        jurisdictionId: born.people[first]!.homeJurisdictionId,
      }),
    ]);
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

  it.todo(
    "step 4a: a household moves away after a job offer elsewhere (A135) - the producer exists (migration/job-offers.ts openOfferElsewhere, answerOfferElsewhere, reviewTown) but needs an opened town with its job market and openings; the small world has none, and a faked offer is not allowed",
  );
  it("step 4b: a death from a recorded cause (Ruling 29): the serious episode, then the death citing it", () => {
    // An older relative in town, through the context-person writer. Their
    // recorded age alone drives their strain; nobody's day is drawn.
    const small = world();
    let next = createCharacterHistoryContextPerson(small.world, {
      stableKey: "lives:oldest-relative",
      givenName: "Oldest",
      familyName: "Relative",
      birthDate: makeIsoDate("1919-02-03"),
      homeJurisdictionId: small.jurisdictionId,
    });
    const elderId = next.personOrder.at(-1)!;
    next = ensureCrisisMortality(next);
    const handlers = composeWorldTimeHandlers();
    // Due items only, a quarter at a time, until the death is on record.
    for (
      let i = 0;
      i < 12 && !next.history.personDeaths.some((d) => d.personId === elderId);
      i += 1
    )
      next = resolveFutureDueItemsThrough(
        next,
        addDays(next.currentDate, 91),
        handlers,
      );
    const death = next.history.personDeaths.find(
      (row) => row.personId === elderId,
    );
    expect(death, "the elder's death is on record").toBeDefined();
    expect(death!.causeKey).toBe(DEATH_CAUSE_ILLNESS_WITH_COURSE);
    const episode = crisisRecords(next).find(
      (record) =>
        record.kind === "health-episode" &&
        record.personId === elderId &&
        record.stableKey.startsWith(FATAL_ILLNESS_EPISODE_PREFIX),
    )!;
    expect(death!.sourceEntityIds).toContain(episode.id);
    expect(episode.effectiveAt < death!.diedAt).toBe(true);
    assertWorldIntegrity(next);
  });
});
