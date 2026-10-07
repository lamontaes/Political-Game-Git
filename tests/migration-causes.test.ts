import { describe, expect, it } from "vitest";

import { smallWorld } from "./fixtures/small-world";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../src/simulation/character-history";
import {
  appendCrisisRecord,
  crisisRecordId,
} from "../src/simulation/crisis/records";
import { addDays, ageOnDate } from "../src/simulation/dates";
import {
  createHousehold,
  createOrganization,
  createWorkRelationship,
  recordHouseholdLocation,
  recordKinship,
  recordWorkStatus,
  startHouseholdMembership,
} from "../src/simulation/life";
import { workStatusAt } from "../src/simulation/life-queries";
import { lifePlaceStateIdentities } from "../src/simulation/life-places";
import { TOWN_JOB_END_REASONS } from "../src/simulation/living-world/town-labor-market";
import {
  laborStatus,
  townResidents,
} from "../src/simulation/living-world/town-employment";
import { townUnemploymentRate } from "../src/simulation/living-world/town-economy-measures";
import {
  ARRIVAL_REASON,
  HOME_LOST_STRENGTH,
  recordedMoves,
  reviewTown,
  townOpenings,
} from "../src/simulation/migration";
import { placeToLookFor } from "../src/simulation/migration/employers-elsewhere";
import { ensureJurisdiction } from "../src/simulation/national-election-geography";
import {
  createDwelling,
  createHousingTenure,
  startDwellingOccupancy,
} from "../src/simulation/resources";
import { SeededRng, pickDistinct } from "../src/simulation/rng";
import type { EntityId, World } from "../src/simulation/types";
import { recordPersonDeath } from "../src/simulation/vitality";
import { assertWorldIntegrity } from "../src/simulation/world";

/**
 * LIVES slice A135 (Lives audit): who moves away, where they go and how many
 * arrive come from recorded jobs, rent and family, not from rolls. A small
 * world (tests/fixtures/small-world.ts) in one place drawn from all 56 by
 * the seed; every fixture is written through the life, resource and crisis
 * writers.
 */
const SEED = "lives-a135-migration-causes";
const STATES = lifePlaceStateIdentities();
const [state] = pickDistinct(new SeededRng(SEED), STATES, 1);
const PLACE = state!.jurisdictionKey;

const provenance = (note: string) => ({ kind: "authored" as const, note });

function world() {
  return smallWorld({ place: PLACE, seed: SEED, people: 8 });
}

/** Residents other than the controlled person, oldest first. */
function othersOldestFirst(small: ReturnType<typeof world>): EntityId[] {
  return small.world.personOrder
    .filter((id) => id !== small.personId)
    .sort(
      (a, b) =>
        small.world.people[a]!.birthDate.localeCompare(
          small.world.people[b]!.birthDate,
        ) || a.localeCompare(b),
    );
}

/** A household in town for these people, formed today. */
function withHousehold(
  world: World,
  key: string,
  town: EntityId,
  personIds: readonly EntityId[],
): { world: World; householdId: EntityId } {
  const today = world.currentDate;
  let next = createHousehold(world, {
    stableKey: `a135:${key}:household`,
    formedAt: today,
    label: `Fixture household ${key}`,
    provenance: provenance("A135 fixture household."),
  });
  const householdId = next.history.households.at(-1)!.id;
  next = recordHouseholdLocation(next, {
    stableKey: `a135:${key}:household-location`,
    householdId,
    effectiveAt: today,
    jurisdictionId: town,
    label: "Fixture residence",
    kind: "residence:community-base",
    provenance: provenance("A135 fixture residence."),
    supersedesLocationId: null,
  });
  for (const personId of personIds)
    next = startHouseholdMembership(next, {
      stableKey: `a135:${key}:membership:${personId}`,
      personId,
      householdId,
      startedAt: today,
      residenceRole: "primary",
      kind: "resident:member",
      provenance: provenance("A135 fixture membership."),
    });
  return { world: next, householdId };
}

/** A recorded job in town, through the life writers. */
function withJob(
  world: World,
  personId: EntityId,
  town: EntityId,
  occupation: "profession:registered-nurse" | "occupation:cashier",
): World {
  const started = addDays(world.currentDate, -700);
  let next = createOrganization(world, {
    stableKey: `a135:employer:${personId}`,
    formedAt: addDays(started, -100),
    provenance: provenance("A135 fixture employer."),
    initialProfile: {
      name: "Fixture Employer",
      classification: "custom:fixture-employer",
      locationJurisdictionId: town,
    },
  });
  next = createWorkRelationship(next, {
    stableKey: `a135:job:${personId}`,
    personId,
    organizationId: next.history.organizations.at(-1)!.id,
    startedAt: started,
    kind: "employment:staff",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: provenance("A135 fixture job."),
    initialRole: {
      title: occupation === "occupation:cashier" ? "Cashier" : "Nurse",
      occupationClassification: occupation,
      locationJurisdictionId: town,
      timeDemand: {
        expectedWeekly: { minimumHours: 36, maximumHours: 40 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: town,
      },
    },
  });
  return next;
}

describe(`A135: moving comes from jobs, rent and family (${PLACE}, seed ${SEED}, drawn from all 56)`, () => {
  it("a wrecked home is weighed with the household's ties: a renter alone goes to a parent, an owner with children stays", () => {
    expect(STATES).toHaveLength(56);
    const small = world();
    const town = small.jurisdictionId;
    const today = small.world.currentDate;
    const others = othersOldestFirst(small);
    const owner = others[0]!;
    const renter = others.at(-1)!;
    expect(
      ageOnDate(small.world.people[renter]!.birthDate, today),
    ).toBeLessThan(ageOnDate(small.world.people[owner]!.birthDate, today));

    // The renter's parent lives in another town, written at that place.
    const elsewhere = placeToLookFor(town, null)!;
    let next = ensureJurisdiction(small.world, elsewhere.context.jurisdiction);
    const parentKey = "a135:renter-parent";
    next = createCharacterHistoryContextPeople(next, [
      {
        stableKey: parentKey,
        givenName: "Fixture",
        familyName: "Parent",
        birthDate: addDays(small.world.people[renter]!.birthDate, -365 * 28),
        homeJurisdictionId: elsewhere.context.jurisdiction.id,
      },
    ]);
    const parent = characterHistoryContextPersonId(next, parentKey);
    next = recordKinship(next, {
      stableKey: "a135:renter-parent:kinship",
      personIds: [parent, renter],
      establishedAt: today,
      kind: "lineal:parent-child",
      provenance: provenance("A135 fixture kinship."),
    });

    // The owner lives with two children in a home they own.
    next = createCharacterHistoryContextPeople(
      next,
      [0, 1].map((n) => ({
        stableKey: `a135:owner-child:${n}`,
        givenName: "Fixture",
        familyName: `Child ${n + 1}`,
        birthDate: addDays(today, -365 * (7 + n * 3)),
        homeJurisdictionId: town,
      })),
    );
    const children = [0, 1].map((n) =>
      characterHistoryContextPersonId(next, `a135:owner-child:${n}`),
    );
    const owned = withHousehold(next, "owner", town, [owner, ...children]);
    next = createDwelling(owned.world, {
      stableKey: "a135:owner:dwelling",
      establishedAt: today,
      jurisdictionId: town,
      locationLabel: "A house in town",
      classification: "residential:house",
      provenance: provenance("A135 fixture house."),
    });
    const dwellingId = next.history.dwellings.at(-1)!.id;
    next = startDwellingOccupancy(next, {
      stableKey: "a135:owner:occupancy",
      occupant: { kind: "household", householdId: owned.householdId },
      dwellingId,
      startedAt: today,
      residenceRole: "primary",
      kind: "residence:owner",
      provenance: provenance("A135 fixture occupancy."),
    });
    next = createHousingTenure(next, {
      stableKey: "a135:owner:tenure",
      holder: { kind: "household", householdId: owned.householdId },
      dwellingId,
      startedAt: today,
      kind: "ownership:owned",
      context: null,
      provenance: provenance("A135 fixture deed."),
    });
    const rented = withHousehold(next, "renter", town, [renter]);
    next = rented.world;

    // A flood destroys both homes, recorded through the crisis writer.
    next = appendCrisisRecord(next, {
      kind: "hazard-episode",
      stableKey: "a135:flood",
      effectiveAt: today,
      causalParentIds: [],
      visibility: "public",
      eventId: null,
      family: "flood",
      magnitude: "catastrophic",
      stateUsps: small.stateUsps,
      jurisdictionIds: [town],
      endsAt: addDays(today, 4),
      basis: "Authored A135 test episode; not a local hazard prediction.",
      sourceReference: null,
    } as Parameters<typeof appendCrisisRecord>[1]);
    const episodeId = crisisRecordId(next, "a135:flood");
    const damage: Record<string, EntityId> = {};
    for (const [key, householdId] of [
      ["owner", owned.householdId],
      ["renter", rented.householdId],
    ] as const) {
      next = appendCrisisRecord(next, {
        kind: "disaster-damage",
        stableKey: `a135:flood:damage:${key}`,
        effectiveAt: today,
        causalParentIds: [episodeId],
        visibility: "limited",
        eventId: null,
        episodeId,
        targetKind: "household",
        targetId: householdId,
        jurisdictionId: town,
        level: "destroyed",
        repairUnits: 10,
      } as Parameters<typeof appendCrisisRecord>[1]);
      damage[key] = crisisRecordId(next, `a135:flood:damage:${key}`);
    }

    const after = reviewTown(next, 0, { arrivals: false });
    assertWorldIntegrity(after);
    const moves = recordedMoves(after).filter((move) =>
      move.reason.startsWith("disaster:"),
    );
    // The renter alone weighs the wreck against little and goes where their
    // parent lives; the owner's deed and children hold the family.
    expect(moves).toHaveLength(1);
    const [move] = moves;
    expect(move!.personIds).toEqual([renter]);
    expect(move!.reason).toBe("disaster:home-destroyed");
    expect(move!.causeId).toBe(damage.renter);
    expect(move!.toJurisdictionId).toBe(elsewhere.context.jurisdiction.id);
    expect(after.people[renter]!.homeJurisdictionId).toBe(
      elsewhere.context.jurisdiction.id,
    );
    for (const id of [owner, ...children])
      expect(after.people[id]!.homeJurisdictionId).toBe(town);
    const event = after.history.events.find(
      (row) =>
        row.type === "migration.moved" &&
        row.participants.some((p) => p.personId === renter),
    )!;
    expect(JSON.stringify(event)).toContain("a disaster destroyed their home");
    expect(HOME_LOST_STRENGTH.destroyed).toBeGreaterThan(
      HOME_LOST_STRENGTH.damaged,
    );
  });

  it("a newcomer comes for a job a worker who died left only when nobody in town is looking, from a recorded place, with no draw", () => {
    const small = world();
    const town = small.jurisdictionId;
    const today = small.world.currentDate;
    const others = othersOldestFirst(small);
    const nurse = others[0]!;
    // Everybody else in town holds a job.
    let next = small.world;
    for (const personId of small.world.personOrder)
      next = withJob(
        next,
        personId,
        town,
        personId === nurse
          ? "profession:registered-nurse"
          : "occupation:cashier",
      );
    const job = next.history.workRelationships.find(
      (row) => row.personId === nurse,
    )!;
    // The nurse died ten days ago, and the job ended with them.
    next = recordPersonDeath(next, {
      stableKey: "a135:nurse-died",
      personId: nurse,
      diedAt: addDays(today, -10),
      causeKey: "illness:fixture",
      sourceEntityIds: [town],
      summary: "Died of an illness.",
      provenance: provenance("A135 fixture death."),
    });
    next = recordWorkStatus(next, {
      stableKey: "a135:nurse-job-ended",
      workRelationshipId: job.id,
      effectiveAt: addDays(today, -10),
      status: "ended",
      reason: TOWN_JOB_END_REASONS.died,
      provenance: provenance("A135 fixture death."),
      supersedesStatusId: workStatusAt(next, job.id)!.id,
    });
    const endedStatus = next.history.workStatuses.at(-1)!;

    // The nurse's job is held open: its pay against a one-person home's
    // rent pulls somebody from elsewhere at once, and a town pushing people
    // out four times over would make it wait.
    const [opening] = townOpenings(next, town, 1);
    expect(opening?.statusId).toBe(endedStatus.id);
    expect(opening!.reviewsOpen).toBe(0);
    expect(opening!.rentShare).not.toBeNull();
    expect(opening!.pull).toBe(
      1 - Math.min(1, Math.max(0, (opening!.rentShare! - 0.3) / 0.5)),
    );
    expect(opening!.pull).toBeGreaterThanOrEqual(1);
    expect(townOpenings(next, town, 4)[0]!.pull).toBeLessThan(1);

    // A resident out of work and looking is hired first: no opening is left
    // for anybody from elsewhere.
    const looking = townResidents(next, town).find(
      (resident) =>
        resident.personId !== nurse &&
        ["employed", "looking-for-work"].includes(laborStatus(next, resident)),
    )!;
    const theirJob = next.history.workRelationships.find(
      (row) => row.personId === looking.personId,
    )!;
    const withSeeker = recordWorkStatus(next, {
      stableKey: "a135:laid-off",
      workRelationshipId: theirJob.id,
      effectiveAt: addDays(today, -5),
      status: "ended",
      reason: TOWN_JOB_END_REASONS.laidOff,
      provenance: provenance("A135 fixture layoff."),
      supersedesStatusId: workStatusAt(next, theirJob.id)!.id,
    });
    expect(townUnemploymentRate(withSeeker, town).value).toBeGreaterThan(0);
    expect(townOpenings(withSeeker, town, 1)).toEqual([]);

    // With nobody looking, the review brings one newcomer for it.
    const after = reviewTown(next, 0);
    assertWorldIntegrity(after);
    const arrivals = after.history.events.filter(
      (event) => event.type === "migration.arrived",
    );
    const forTheJob = arrivals.filter((event) =>
      event.tags.includes(`opening:${endedStatus.id}`),
    );
    expect(forTheJob).toHaveLength(1);
    const arrived = forTheJob[0]!;
    expect(arrived.tags).toContain(`reason:${ARRIVAL_REASON}`);
    const origin = placeToLookFor(town, null)!.context.jurisdiction.id;
    expect(arrived.tags).toContain(`from:${origin}`);
    const newcomer = arrived.participants[0]!.personId;
    expect(after.people[newcomer]!.homeJurisdictionId).toBe(town);
    expect(arrived.summary).toMatch(/to work as the town's new nurse\.$/);
    // Every newcomer names the recorded job they came for.
    const ended = new Set(after.history.workStatuses.map((row) => row.id));
    for (const event of arrivals) {
      const tag = event.tags.find((row) => row.startsWith("opening:"));
      expect(tag && ended.has(tag.slice("opening:".length) as EntityId)).toBe(
        true,
      );
    }
    // Taken, the opening is no longer held for anybody else.
    expect(
      townOpenings(after, town, 1).some(
        (row) => row.statusId === endedStatus.id,
      ),
    ).toBe(false);
  });
});
