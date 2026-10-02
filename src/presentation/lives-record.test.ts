import { describe, expect, it } from "vitest";

import { smallWorld } from "../../tests/fixtures/small-world";
import { composeWorldTimeHandlers } from "../simulation/campaigns";
import { addDays, makeIsoDate } from "../simulation/dates";
import { resolveFutureDueItemsThrough } from "../simulation/future-transitions";
import {
  familyPlans,
  proposeFamilyPlan,
} from "../simulation/people-family-plan";
import {
  createHousehold,
  createOrganization,
  createPartnership,
  createWorkRelationship,
  recordHouseholdLocation,
  recordWorkStatus,
  startHouseholdMembership,
} from "../simulation/life";
import { personName } from "../simulation/people";
import { workStatusAt } from "../simulation/life-queries";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { TOWN_JOB_END_REASONS } from "../simulation/living-world/town-labor-market";
import { relocateHousehold } from "../simulation/migration/relocate";
import { SeededRng, pickDistinct } from "../simulation/rng";
import type { EntityId, World } from "../simulation/types";
import { recordEventKnowledge } from "../simulation/records";
import { recordWorldEvent } from "../simulation/world";
import { JOB_ENDED_EVENT } from "../simulation/neighbor-news";
import { projectLivesRecord } from "./lives-record";

/**
 * LIVES step 5: what the screen reads. One place per file, drawn from all 56
 * by the seed, on a small world (tests/fixtures/small-world.ts).
 */
const SEED = "lives-screens-20261001";
const [state] = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  1,
);
const small = smallWorld({
  place: state!.jurisdictionKey,
  seed: SEED,
  people: 5,
});
const provenance = (note: string) => ({ kind: "authored" as const, note });

function withHousehold(world: World, personId: EntityId, key: string): World {
  let next = createHousehold(world, {
    stableKey: `${key}:household`,
    formedAt: world.currentDate,
    label: "Fixture household",
    provenance: provenance("LIVES screens fixture."),
  });
  const householdId = next.history.households.at(-1)!.id;
  next = recordHouseholdLocation(next, {
    stableKey: `${key}:location`,
    householdId,
    effectiveAt: next.currentDate,
    jurisdictionId: next.people[personId]!.homeJurisdictionId,
    label: "Fixture residence",
    kind: "residence:community-base",
    provenance: provenance("LIVES screens fixture."),
    supersedesLocationId: null,
  });
  return startHouseholdMembership(next, {
    stableKey: `${key}:membership`,
    personId,
    householdId,
    startedAt: next.currentDate,
    residenceRole: "primary",
    kind: "resident:member",
    provenance: provenance("LIVES screens fixture."),
  });
}

/** The player is told of an event by somebody, through the knowledge writer. */
function tell(world: World, eventId: EntityId, toldBy: EntityId): World {
  const event = world.history.events.find((row) => row.id === eventId)!;
  return recordEventKnowledge(world, {
    stableKey: `lives-screens:told:${eventId}`,
    personId: small.personId,
    eventId,
    learnedAt: world.currentDate,
    believedSummary: event.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "told-by", sourcePersonId: toldBy, claimId: null },
  });
}

describe(`LIVES screens in ${state!.jurisdictionKey} (seed ${SEED})`, () => {
  it("reads how the player grew up from the upbringing record, and writes nothing", () => {
    const first = projectLivesRecord(small.world, small.personId);
    expect(first.upbringing.length).toBeGreaterThanOrEqual(3);
    for (const line of first.upbringing) expect(line).toMatch(/[.]$/);
    expect(projectLivesRecord(small.world, small.personId)).toEqual(first);
    // No trait was ever recorded for this person, so none is claimed.
    expect(first.leanings).toEqual([]);
    expect(first.around).toEqual([]);
    expect(first.upbringing.join(" ")).toContain("ESTIMATED childhood context");
    // Composition estimates do not fabricate how caregivers treated someone.
    expect(first.upbringing.join(" ")).toContain("not on record");
  });

  it("shows a neighbor's recorded job loss, with who and where, and not an unrelated end", () => {
    const neighbor = small.world.personOrder[1]!;
    let next = createOrganization(small.world, {
      stableKey: "lives-screens:employer",
      formedAt: small.world.currentDate,
      provenance: provenance("LIVES screens fixture employer."),
      initialProfile: {
        name: "Fixture Employer",
        classification: "custom:fixture-employer",
        locationJurisdictionId: small.jurisdictionId,
      },
    });
    const organizationId = next.history.organizations.at(-1)!.id;
    next = createWorkRelationship(next, {
      stableKey: "lives-screens:job",
      personId: neighbor,
      organizationId,
      startedAt: addDays(next.currentDate, -60),
      kind: "employment:staff",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: provenance("LIVES screens fixture job."),
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
    expect(projectLivesRecord(next, small.personId).around).toEqual([]);
    next = recordWorkStatus(next, {
      stableKey: "lives-screens:job-lost",
      workRelationshipId: job.id,
      effectiveAt: next.currentDate,
      status: "ended",
      reason: TOWN_JOB_END_REASONS.laidOff,
      provenance: provenance("LIVES screens fixture layoff."),
      supersedesStatusId: workStatusAt(next, job.id)!.id,
    });
    // The layoff is a work status, and nobody has written an event for it, so
    // there is nothing to be told of: the screen shows nothing.
    expect(projectLivesRecord(next, small.personId).around).toEqual([]);
    // A producer that did write the event, and told the player, would show it.
    const employer = "Fixture Employer";
    const who = personName(next.people[neighbor]!);
    next = recordWorldEvent(next, {
      stableKey: "lives-screens:job-ended-event",
      type: JOB_ENDED_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: small.jurisdictionId,
      involvedEntityIds: [neighbor, organizationId],
      participants: [
        { personId: neighbor, role: "focus:subject", detail: "Lost the job" },
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: ["work.job-ended", "reason:labor:laid-off"],
      summary: `${who} was laid off from ${employer}.`,
      context: {
        location: null,
        socialContext: "A layoff in town.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const eventId = next.history.events.at(-1)!.id;
    expect(projectLivesRecord(next, small.personId).around).toEqual([]);
    const told = tell(next, eventId, small.world.personOrder[2]!);
    const [line] = projectLivesRecord(told, small.personId).around;
    expect(line).toMatchObject({ kind: "job-loss", at: told.currentDate });
    expect(line!.sentence).toContain(next.people[neighbor]!.givenName);
    expect(line!.sentence).toContain(employer);
  });

  it("shows a household moving out of town, from the recorded move", () => {
    const mover = small.world.personOrder[2]!;
    const before = withHousehold(small.world, mover, "lives-screens:mover");
    const moved = relocateHousehold(before, {
      stableKey: "lives-screens:move",
      personId: mover,
      toJurisdictionId: small.stateJurisdictionId,
      reason: "work:transfer",
      waveKey: null,
      why: "took a job elsewhere",
    });
    expect(projectLivesRecord(moved, small.personId).around).toEqual([]);
    const moveEvent = moved.history.events.find(
      (row) => row.type === "migration.moved",
    )!;
    const told = tell(moved, moveEvent.id, small.world.personOrder[3]!);
    const move = projectLivesRecord(told, small.personId).around.find(
      (line) => line.kind === "move",
    );
    expect(move, "the move is on the player's screen once told").toBeDefined();
    expect(move!.sentence).toContain("moved from");
    expect(move!.sentence).toContain("took a job elsewhere");
    expect(makeIsoDate(move!.at)).toBe(moved.currentDate);
  });

  it("shows a birth in town with its named parents", () => {
    const [a, b] = [small.world.personOrder[3]!, small.world.personOrder[4]!];
    let next = withHousehold(small.world, a, "lives-screens:parents");
    const householdId = next.history.households.at(-1)!.id;
    next = startHouseholdMembership(next, {
      stableKey: "lives-screens:parents:membership-b",
      personId: b,
      householdId,
      startedAt: next.currentDate,
      residenceRole: "primary",
      kind: "resident:member",
      provenance: provenance("LIVES screens fixture."),
    });
    next = createPartnership(next, {
      stableKey: "lives-screens:partnership",
      personIds: [a, b].sort() as [EntityId, EntityId],
      kind: "legal:marriage",
      startedAt: addDays(next.currentDate, -400),
      provenance: provenance("LIVES screens fixture."),
    });
    next = resolveFutureDueItemsThrough(
      proposeFamilyPlan(next, { personId: a, kind: "birth" }),
      addDays(next.currentDate, 5),
      composeWorldTimeHandlers(),
    );
    const plan = familyPlans(next, a)[0]!;
    expect(plan.answer).toBe("agreed");
    next = resolveFutureDueItemsThrough(
      next,
      makeIsoDate(plan.resolvesOn!),
      composeWorldTimeHandlers(),
    );
    expect(projectLivesRecord(next, small.personId).around).toEqual([]);
    const birthEvent = next.history.events.find(
      (row) => row.type === "life.family-member-added",
    )!;
    const told = tell(next, birthEvent.id, a);
    const birth = projectLivesRecord(told, small.personId).around.find(
      (line) => line.kind === "birth",
    );
    expect(birth, "the birth is on the screen once told").toBeDefined();
    expect(birth!.sentence).toContain("was born to");
    expect(birth!.sentence).toContain(next.people[a]!.givenName);
    expect(birth!.sentence).toContain(next.people[b]!.givenName);
  });
});
