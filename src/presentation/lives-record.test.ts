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
import { workStatusAt } from "../simulation/life-queries";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { TOWN_JOB_END_REASONS } from "../simulation/living-world/town-labor-market";
import { relocateHousehold } from "../simulation/migration/relocate";
import { SeededRng, pickDistinct } from "../simulation/rng";
import type { EntityId, World } from "../simulation/types";
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

describe(`LIVES screens in ${state!.jurisdictionKey} (seed ${SEED})`, () => {
  it("reads how the player grew up from the upbringing record, and writes nothing", () => {
    const first = projectLivesRecord(small.world, small.personId);
    expect(first.upbringing.length).toBeGreaterThanOrEqual(3);
    for (const line of first.upbringing) expect(line).toMatch(/[.]$/);
    expect(projectLivesRecord(small.world, small.personId)).toEqual(first);
    // No trait was ever recorded for this person, so none is claimed.
    expect(first.leanings).toEqual([]);
    expect(first.around).toEqual([]);
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
    const [line] = projectLivesRecord(next, small.personId).around;
    expect(line).toMatchObject({ kind: "job-loss", at: next.currentDate });
    expect(line!.sentence).toContain(next.people[neighbor]!.givenName);
    expect(line!.sentence).toContain("Fixture Employer");
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
    const move = projectLivesRecord(moved, small.personId).around.find(
      (line) => line.kind === "move",
    );
    expect(move, "the move is on the player's screen").toBeDefined();
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
    const birth = projectLivesRecord(next, small.personId).around.find(
      (line) => line.kind === "birth",
    );
    expect(birth, "the birth is on the player's screen").toBeDefined();
    expect(birth!.sentence).toContain("was born to");
    expect(birth!.sentence).toContain(next.people[a]!.givenName);
    expect(birth!.sentence).toContain(next.people[b]!.givenName);
  });
});
