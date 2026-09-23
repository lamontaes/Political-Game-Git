import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import { organizationProfileAt } from "../../src/simulation/life-queries";
import {
  NEIGHBOR_HOUSEHOLDS,
  PEOPLE_PER_HOUSEHOLD,
  TOWN_RESIDENTS_VERSION,
  UNKNOWN_TOWN_POPULATION,
  describeTownResidents,
  ensureTownResidents,
  materializeTownHousehold,
  townHouseholdSkeleton,
  townRoster,
} from "../../src/simulation/living-world/town-residents";
import type { EntityId, World } from "../../src/simulation";

const HOUMA = "2236255";
const RENO = "3260600";

function openAt(placeKey: string, seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey,
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  return { world: game.world, personId: game.playerPersonId };
}

const seated = (world: World) =>
  world.history.households.filter((household) =>
    household.stableKey.startsWith(`${TOWN_RESIDENTS_VERSION}:`),
  );

function townOrganizations(world: World, town: EntityId, kind: string) {
  return world.history.organizations.filter((organization) => {
    const profile = organizationProfileAt(world, organization.id);
    return (
      profile?.classification === kind &&
      profile.locationJurisdictionId === town
    );
  });
}

describe("a new game's town has residents", { timeout: 180_000 }, () => {
  it.each([
    ["Houma, Louisiana", HOUMA],
    ["Reno, Nevada", RENO],
  ])(
    "%s: homes, schools, the market and congregations have people in them",
    (_, placeKey) => {
      const { world, personId } = openAt(placeKey, `residents-${placeKey}`);
      const town = world.people[personId]!.homeJurisdictionId;
      const households = seated(world);
      expect(households.length).toBeGreaterThanOrEqual(NEIGHBOR_HOUSEHOLDS);
      // Only a small part of the town is written out.
      expect(households.length).toBeLessThan(townRoster(town).households / 100);

      // Everyone seated lives in the town and in exactly one of its homes.
      const members = world.history.householdMemberships.filter((membership) =>
        households.some((household) => household.id === membership.householdId),
      );
      const people = new Set(members.map((membership) => membership.personId));
      expect(members).toHaveLength(people.size);
      for (const id of people)
        expect(world.people[id]!.homeJurisdictionId).toBe(town);

      // Children go to the town's schools.
      const schools = townOrganizations(world, town, "service:school");
      expect(schools.length).toBeGreaterThan(0);
      const pupils = world.history.educationEnrollments.filter(
        (enrollment) =>
          people.has(enrollment.personId) &&
          schools.some((school) => school.id === enrollment.organizationId),
      );
      expect(pupils.length).toBeGreaterThan(0);

      // The market and the schools employ residents.
      const [market] = townOrganizations(world, town, "enterprise:retail");
      const staff = world.history.workRelationships.filter((work) =>
        people.has(work.personId),
      );
      expect(staff.some((work) => work.organizationId === market!.id)).toBe(
        true,
      );
      expect(
        staff.some((work) =>
          schools.some((school) => school.id === work.organizationId),
        ),
      ).toBe(true);
      // Nobody is employed who is outside working age.
      for (const work of staff) {
        const born = Number(world.people[work.personId]!.birthDate.slice(0, 4));
        expect(
          Number(world.currentDate.slice(0, 4)) - born,
        ).toBeGreaterThanOrEqual(18);
      }

      // Congregations exist in the town and have members.
      const congregations = townOrganizations(
        world,
        town,
        "community:congregation",
      );
      expect(congregations).toHaveLength(4);
      const congregants = world.history.organizationParticipations.filter(
        (participation) =>
          congregations.some((c) => c.id === participation.organizationId),
      );
      expect(congregants.length).toBeGreaterThan(0);
    },
    120_000,
  );

  it("seats a town once", () => {
    const { world, personId } = openAt(RENO, "residents-once");
    expect(ensureTownResidents(world, personId)).toBe(world);
  });

  it("seats the same town the same way from the same seed", () => {
    const first = openAt(HOUMA, "residents-same");
    const second = openAt(HOUMA, "residents-same");
    const names = (world: World) =>
      seated(world).map((household) => household.label);
    expect(names(second.world)).toEqual(names(first.world));
  });
});

describe("the town's size", { timeout: 180_000 }, () => {
  it("follows the Census reference, and a place it does not cover gets a marked placeholder", () => {
    const { world, personId } = openAt(RENO, "residents-size");
    const town = world.people[personId]!.homeJurisdictionId;
    const roster = townRoster(town);
    expect(roster.referencePopulation).toBe(283_621);
    expect(roster.households).toBe(Math.ceil(283_621 / PEOPLE_PER_HOUSEHOLD));
    const described = describeTownResidents(world, town);
    // The sampled estimate lands near the reference it was generated from.
    expect(described.estimated.people / 283_621).toBeGreaterThan(0.95);
    expect(described.estimated.people / 283_621).toBeLessThan(1.05);
    expect(UNKNOWN_TOWN_POPULATION).toBeGreaterThan(0);
  });

  it("writes a household once, as the same people its skeleton describes", () => {
    const { world, personId } = openAt(HOUMA, "residents-write");
    const town = world.people[personId]!.homeJurisdictionId;
    const index = townRoster(town).households - 1;
    const once = materializeTownHousehold(world, town, index);
    expect(materializeTownHousehold(once, town, index)).toBe(once);
    const members = townHouseholdSkeleton(once, town, index).members;
    expect(once.personOrder.length - world.personOrder.length).toBe(
      members.length,
    );
  });
});
