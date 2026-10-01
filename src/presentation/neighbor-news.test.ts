import { describe, expect, it } from "vitest";

import { smallWorld } from "../../tests/fixtures/small-world";
import { composeWorldTimeHandlers } from "../simulation/campaigns";
import { addDays, ageOnDate, makeIsoDate } from "../simulation/dates";
import { resolveFutureDueItemsThrough } from "../simulation/future-transitions";
import {
  createHousehold,
  createOrganization,
  createPartnership,
  createWorkRelationship,
  recordHouseholdLocation,
  recordWorkStatus,
  startHouseholdMembership,
} from "../simulation/life";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { workStatusAt } from "../simulation/life-queries";
import { relocateHousehold } from "../simulation/migration/relocate";
import {
  JOB_ENDED_EVENT,
  peopleTiedTo,
  recordJobEndedNews,
} from "../simulation/neighbor-news";
import {
  familyPlans,
  proposeFamilyPlan,
} from "../simulation/people-family-plan";
import { recordRelationshipInteraction } from "../simulation/records";
import { SeededRng, pickDistinct } from "../simulation/rng";
import type { EntityId, World } from "../simulation/types";
import { projectLivesRecord } from "./lives-record";

/**
 * LIVES step 5c: news reaches the people tied to the one it happened to, by a
 * recorded household, family or friendship, and nobody else. One place, drawn
 * from all 56 by the seed, on a small world (tests/fixtures/small-world.ts).
 */
const SEED = "lives-tell-paths-20261001";
const [state] = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  1,
);
const small = smallWorld({
  place: state!.jurisdictionKey,
  seed: SEED,
  people: 9,
});
const [player, friend, mate, stranger] = small.world.personOrder.slice(
  0,
  5,
) as [EntityId, EntityId, EntityId, EntityId];
// Two adults old enough to plan a child, who are neither the player, their
// friend nor the stranger.
const parents = small.world.personOrder.filter((id) => {
  const age = ageOnDate(
    small.world.people[id]!.birthDate,
    small.world.currentDate,
  );
  return ![player, friend, stranger].includes(id) && age >= 22 && age <= 38;
});
const provenance = (note: string) => ({ kind: "authored" as const, note });

function household(world: World, members: readonly EntityId[], key: string) {
  let next = createHousehold(world, {
    stableKey: `${key}:household`,
    formedAt: world.currentDate,
    label: "Fixture household",
    provenance: provenance("LIVES tell-paths fixture."),
  });
  const householdId = next.history.households.at(-1)!.id;
  next = recordHouseholdLocation(next, {
    stableKey: `${key}:location`,
    householdId,
    effectiveAt: next.currentDate,
    jurisdictionId: next.people[members[0]!]!.homeJurisdictionId,
    label: "Fixture residence",
    kind: "residence:community-base",
    provenance: provenance("LIVES tell-paths fixture."),
    supersedesLocationId: null,
  });
  for (const personId of members)
    next = startHouseholdMembership(next, {
      stableKey: `${key}:membership:${personId}`,
      personId,
      householdId,
      startedAt: next.currentDate,
      residenceRole: "primary",
      kind: "resident:member",
      provenance: provenance("LIVES tell-paths fixture."),
    });
  return next;
}

/** A recorded friendship: strengthening, meaningful moments over a year. */
function befriend(world: World, a: EntityId, b: EntityId): World {
  let next = world;
  for (let month = 1; month <= 6; month += 1)
    next = recordRelationshipInteraction(next, {
      stableKey: `lives-tell-paths:friend:${a}:${b}:${month}`,
      personIds: [a, b].sort() as [EntityId, EntityId],
      eventId: null,
      occurredAt: addDays(next.currentDate, -month * 30),
      kind: "support:friendship",
      change: "strengthened",
      significance: "major",
      summary: "They looked out for each other.",
      tags: [],
    });
  return next;
}

const heard = (world: World, personId: EntityId, type: string) =>
  world.history.knowledge.filter(
    (row) =>
      row.personId === personId &&
      world.history.events.find((event) => event.id === row.eventId)?.type ===
        type,
  );

describe(`LIVES tell-paths in ${state!.jurisdictionKey} (seed ${SEED})`, () => {
  it("the player hears of a friend's move; somebody with no tie does not", () => {
    let world = household(small.world, [friend], "lives-tell:friend");
    world = befriend(world, player, friend);
    expect(peopleTiedTo(world, [friend])).toContain(player);
    expect(peopleTiedTo(world, [friend])).not.toContain(stranger);
    const moved = relocateHousehold(world, {
      stableKey: "lives-tell-paths:move",
      personId: friend,
      toJurisdictionId: small.stateJurisdictionId,
      reason: "work:transfer",
      waveKey: null,
      why: "took a job elsewhere",
    });
    const [row] = heard(moved, player, "migration.moved");
    expect(row).toMatchObject({
      source: { kind: "told-by", sourcePersonId: friend },
    });
    expect(heard(moved, stranger, "migration.moved")).toEqual([]);
    const [line] = projectLivesRecord(moved, player).around;
    expect(line).toMatchObject({ kind: "move", at: moved.currentDate });
    expect(line!.sentence).toContain("took a job elsewhere");
    expect(projectLivesRecord(moved, stranger).around).toEqual([]);
  });

  it("the household hears of its own member's layoff; a stranger does not", () => {
    let world = household(small.world, [player, mate], "lives-tell:home");
    world = createOrganization(world, {
      stableKey: "lives-tell-paths:employer",
      formedAt: world.currentDate,
      provenance: provenance("LIVES tell-paths fixture employer."),
      initialProfile: {
        name: "Fixture Employer",
        classification: "custom:fixture-employer",
        locationJurisdictionId: small.jurisdictionId,
      },
    });
    const organizationId = world.history.organizations.at(-1)!.id;
    world = createWorkRelationship(world, {
      stableKey: "lives-tell-paths:job",
      personId: mate,
      organizationId,
      startedAt: addDays(world.currentDate, -60),
      kind: "employment:staff",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: provenance("LIVES tell-paths fixture job."),
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
    const job = world.history.workRelationships.at(-1)!;
    world = recordWorkStatus(world, {
      stableKey: "lives-tell-paths:job-lost",
      workRelationshipId: job.id,
      effectiveAt: world.currentDate,
      status: "ended",
      reason: "labor:laid-off",
      provenance: provenance("LIVES tell-paths fixture layoff."),
      supersedesStatusId: workStatusAt(world, job.id)!.id,
    });
    const statusId = world.history.workStatuses.at(-1)!.id;
    // The same writer the labor market and a business closure call as the job ends.
    const told = recordJobEndedNews(world, statusId, { closedBusiness: false });
    // Asked again for the same ended job, it writes nothing more.
    expect(recordJobEndedNews(told, statusId, { closedBusiness: false })).toBe(
      told,
    );
    const [row] = heard(told, player, JOB_ENDED_EVENT);
    expect(row).toMatchObject({
      source: { kind: "told-by", sourcePersonId: mate },
    });
    expect(heard(told, stranger, JOB_ENDED_EVENT)).toEqual([]);
    const [line] = projectLivesRecord(told, player).around;
    expect(line).toMatchObject({ kind: "job-loss" });
    expect(line!.sentence).toContain("Fixture Employer");
    expect(projectLivesRecord(told, stranger).around).toEqual([]);
    // The work status is still the record of the loss, one writer's record.
    expect(workStatusAt(told, job.id)!.reason).toBe("labor:laid-off");
  });

  it("a friend of a parent hears of the birth through the family writer", () => {
    let world = household(
      small.world,
      [parents[0]!, parents[1]!],
      "lives-tell:parents",
    );
    world = befriend(world, player, parents[0]!);
    world = createPartnership(world, {
      stableKey: "lives-tell-paths:partnership",
      personIds: [parents[0]!, parents[1]!].sort() as [EntityId, EntityId],
      kind: "legal:marriage",
      startedAt: addDays(world.currentDate, -400),
      provenance: provenance("LIVES tell-paths fixture."),
    });
    world = resolveFutureDueItemsThrough(
      proposeFamilyPlan(world, { personId: parents[0]!, kind: "birth" }),
      addDays(world.currentDate, 5),
      composeWorldTimeHandlers(),
    );
    const plan = familyPlans(world, parents[0]!)[0]!;
    expect(plan.answer).toBe("agreed");
    world = resolveFutureDueItemsThrough(
      world,
      makeIsoDate(plan.resolvesOn!),
      composeWorldTimeHandlers(),
    );
    const [row] = heard(world, player, "life.family-member-added");
    expect(row).toMatchObject({ source: { kind: "told-by" } });
    expect(heard(world, stranger, "life.family-member-added")).toEqual([]);
    const [line] = projectLivesRecord(world, player).around;
    expect(line).toMatchObject({ kind: "birth" });
    expect(line!.sentence).toContain("was born to");
  });
});
