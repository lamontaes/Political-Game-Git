import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import {
  createHousehold,
  startHouseholdMembership,
  recordHouseholdMembershipState,
} from "./life";
import { householdMembershipsAt } from "./life-queries";
import { stateJurisdictionForKey } from "./life-places";
import { createLightweightPerson } from "./people";
import {
  activeDwellingOccupanciesAt,
  activeHousingTenuresAt,
  dwellingOccupancyStateAt,
  housingTenureStateAt,
  sameEndpoint,
  primaryDwellingOf,
} from "./resource-queries";
import {
  createDwelling,
  createHousingTenure,
  startDwellingOccupancy,
  recordDwellingOccupancyState,
  recordHousingTenureState,
} from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  STATES,
  isTerritoryUsps,
  isFederalDistrictUsps,
} from "./state-reference";
import { createWorld, createWorldId } from "./world";
import type {
  Dwelling,
  DwellingOccupant,
  EntityId,
  ResidenceRole,
  World,
} from "./types";

const TODAY = makeIsoDate("2026-01-05");
const YESTERDAY = makeIsoDate("2026-01-04");
const AUTHORED = {
  kind: "authored",
  note: "Fictional primary-dwelling query fixture.",
} as const;
const REGIONS = Object.keys(STATES).sort();

function smallWorld(usps: string): World {
  const seed = `primary-dwelling-query:${usps}`;
  const jurisdiction = stateJurisdictionForKey(`US-${usps}`);
  if (!jurisdiction)
    throw new Error(`Missing canonical jurisdiction for ${usps}`);
  return createWorld({
    seed,
    currentDate: TODAY,
    jurisdictions: [jurisdiction],
    people: [0, 1].map((index) =>
      createLightweightPerson({
        worldId: createWorldId(seed),
        worldSeed: seed,
        index,
        profile: "stress",
        currentDate: TODAY,
        homeJurisdictionId: jurisdiction.id,
      }),
    ),
  });
}

// Literal survivor selection from town-wards.ts:171–206, without address mapping.
function inlinePrimaryDwelling(
  world: World,
  personId: EntityId,
): Dwelling | null {
  if (!world.people[personId]) return null;
  const primaryHouseholds = new Set(
    householdMembershipsAt(world, personId)
      .filter((row) => row.state.residenceRole === "primary")
      .map((row) => row.household.id),
  );
  const tenures = activeHousingTenuresAt(world);
  const occupancy = [...activeDwellingOccupanciesAt(world)]
    .reverse()
    .find(
      (row) =>
        (row.occupant.kind === "person"
          ? row.occupant.personId === personId
          : primaryHouseholds.has(row.occupant.householdId)) &&
        dwellingOccupancyStateAt(world, row.id)?.residenceRole === "primary" &&
        tenures.some(
          (tenure) =>
            tenure.dwellingId === row.dwellingId &&
            sameEndpoint(tenure.holder, row.occupant),
        ),
    );
  return occupancy
    ? (world.history.dwellings.find((row) => row.id === occupancy.dwellingId) ??
        null)
    : null;
}

function addDwelling(world: World, key: string): [World, Dwelling] {
  const next = createDwelling(world, {
    stableKey: key,
    establishedAt: YESTERDAY,
    jurisdictionId: world.jurisdictionOrder[0]!,
    locationLabel: `Fixture ${key}`,
    classification: "residential:fixture",
    provenance: AUTHORED,
  });
  return [next, next.history.dwellings.at(-1)!];
}

function occupy(
  world: World,
  dwelling: Dwelling,
  occupant: DwellingOccupant,
  key: string,
  residenceRole: ResidenceRole = "primary",
): World {
  return startDwellingOccupancy(world, {
    stableKey: key,
    dwellingId: dwelling.id,
    occupant,
    startedAt: TODAY,
    residenceRole,
    kind: "residence:fixture",
    provenance: AUTHORED,
  });
}

function tenure(
  world: World,
  dwelling: Dwelling,
  holder: DwellingOccupant,
  key: string,
): World {
  return createHousingTenure(world, {
    stableKey: key,
    dwellingId: dwelling.id,
    holder,
    startedAt: TODAY,
    kind: "lease:fixture",
    context: null,
    provenance: AUTHORED,
  });
}

function household(
  world: World,
  personId: EntityId,
  role: ResidenceRole = "primary",
): [World, DwellingOccupant] {
  let next = createHousehold(world, {
    stableKey: "fixture:household",
    formedAt: YESTERDAY,
    label: "Fixture household",
    provenance: AUTHORED,
  });
  const householdId = next.history.households.at(-1)!.id;
  next = startHouseholdMembership(next, {
    stableKey: "fixture:membership",
    personId,
    householdId,
    startedAt: TODAY,
    residenceRole: role,
    kind: "resident:household-member",
    provenance: AUTHORED,
  });
  return [next, { kind: "household", householdId }];
}

function verify(
  world: World,
  personId: EntityId,
  expected: Dwelling | null,
): void {
  const before = serializeWorld(world);
  const actual = primaryDwellingOf(world, personId);
  expect(actual).toBe(expected);
  expect(actual).toBe(inlinePrimaryDwelling(world, personId));
  expect(serializeWorld(world)).toBe(before);
  const restored = deserializeWorld(before);
  expect(primaryDwellingOf(restored, personId)).toEqual(expected);
  expect(primaryDwellingOf(restored, personId)).toBe(
    inlinePrimaryDwelling(restored, personId),
  );
  expect(serializeWorld(restored)).toBe(before);
}

describe("primaryDwellingOf preserves the recorded town-ward dwelling selection", () => {
  it("covers 50 states, DC and five territories", () => {
    expect(REGIONS).toHaveLength(56);
    expect(REGIONS.filter(isTerritoryUsps)).toHaveLength(5);
    expect(REGIONS.filter(isFederalDistrictUsps)).toEqual(["DC"]);
    expect(
      REGIONS.filter(
        (code) => !isTerritoryUsps(code) && !isFederalDistrictUsps(code),
      ),
    ).toHaveLength(50);
  });

  it.each(REGIONS)(
    "%s requires both primary occupancy and matching holder tenure",
    (usps) => {
      let world = smallWorld(usps);
      const personId = world.personOrder[0]!;
      verify(world, personId, null);
      verify(world, createStableId("person", "fixture:unknown-person"), null);
      let home: Dwelling;
      [world, home] = addDwelling(world, "fixture:home");
      verify(world, personId, null);
      world = occupy(
        world,
        home,
        { kind: "person", personId },
        "fixture:occupancy",
      );
      verify(world, personId, null);
      world = tenure(
        world,
        home,
        { kind: "person", personId: world.personOrder[1]! },
        "fixture:wrong-holder",
      );
      verify(world, personId, null);
      let otherHome: Dwelling;
      [world, otherHome] = addDwelling(world, "fixture:other-home");
      world = tenure(
        world,
        otherHome,
        { kind: "person", personId },
        "fixture:wrong-dwelling",
      );
      verify(world, personId, null);
      world = tenure(
        world,
        home,
        { kind: "person", personId },
        "fixture:matching-tenure",
      );
      verify(world, personId, home);
    },
  );

  it.each(REGIONS)(
    "%s ignores secondary occupancy even with matching tenure",
    (usps) => {
      let world = smallWorld(usps);
      const personId = world.personOrder[0]!;
      let home: Dwelling;
      [world, home] = addDwelling(world, "fixture:home");
      const endpoint = { kind: "person", personId } as const;
      world = tenure(world, home, endpoint, "fixture:tenure");
      world = occupy(world, home, endpoint, "fixture:secondary", "secondary");
      verify(world, personId, null);
    },
  );

  it.each(REGIONS)(
    "%s follows primary household membership but excludes guests and ended membership",
    (usps) => {
      let world = smallWorld(usps);
      const personId = world.personOrder[0]!;
      let endpoint: DwellingOccupant;
      [world, endpoint] = household(world, personId, "secondary");
      let home: Dwelling;
      [world, home] = addDwelling(world, "fixture:home");
      world = tenure(world, home, endpoint, "fixture:tenure");
      world = occupy(world, home, endpoint, "fixture:occupancy");
      verify(world, personId, null);
      let prior = world.history.householdMembershipStates.at(-1)!;
      world = recordHouseholdMembershipState(world, {
        stableKey: "fixture:membership-primary",
        membershipId: prior.membershipId,
        effectiveAt: TODAY,
        status: "resident",
        residenceRole: "primary",
        kind: "resident:household-member",
        provenance: AUTHORED,
        supersedesStateId: prior.id,
      });
      verify(world, personId, home);
      prior = world.history.householdMembershipStates.at(-1)!;
      world = recordHouseholdMembershipState(world, {
        stableKey: "fixture:membership-ended",
        membershipId: prior.membershipId,
        effectiveAt: TODAY,
        status: "ended",
        residenceRole: "primary",
        kind: "resident:household-member",
        provenance: AUTHORED,
        supersedesStateId: prior.id,
      });
      verify(world, personId, null);
    },
  );

  it.each(REGIONS)(
    "%s selects latest recorded occupancy across person and household endpoints",
    (usps) => {
      let world = smallWorld(usps);
      const personId = world.personOrder[0]!;
      let first: Dwelling;
      [world, first] = addDwelling(world, "fixture:first");
      const person = { kind: "person", personId } as const;
      world = tenure(world, first, person, "fixture:first-tenure");
      world = occupy(world, first, person, "fixture:first-occupancy");
      verify(world, personId, first);
      let endpoint: DwellingOccupant;
      [world, endpoint] = household(world, personId);
      let second: Dwelling;
      [world, second] = addDwelling(world, "fixture:second");
      world = tenure(world, second, endpoint, "fixture:second-tenure");
      world = occupy(world, second, endpoint, "fixture:second-occupancy");
      verify(world, personId, second);
      const state = world.history.dwellingOccupancyStates.at(-1)!;
      world = recordDwellingOccupancyState(world, {
        stableKey: "fixture:second-occupancy-ended",
        dwellingOccupancyId: state.dwellingOccupancyId,
        effectiveAt: TODAY,
        status: "ended",
        residenceRole: "primary",
        kind: "residence:fixture",
        reason: "Fixture household left",
        provenance: AUTHORED,
        supersedesStateId: state.id,
      });
      verify(world, personId, first);
    },
  );

  it.each(REGIONS)(
    "%s ends tenure without treating remaining occupancy as ownership evidence",
    (usps) => {
      let world = smallWorld(usps);
      const personId = world.personOrder[0]!;
      let home: Dwelling;
      [world, home] = addDwelling(world, "fixture:home");
      const endpoint = { kind: "person", personId } as const;
      world = tenure(world, home, endpoint, "fixture:tenure");
      world = occupy(world, home, endpoint, "fixture:occupancy");
      verify(world, personId, home);
      const tenureId = world.history.housingTenures.at(-1)!.id;
      const state = housingTenureStateAt(world, tenureId)!;
      world = recordHousingTenureState(world, {
        stableKey: "fixture:tenure-ended",
        housingTenureId: tenureId,
        effectiveAt: TODAY,
        status: "ended",
        context: null,
        provenance: AUTHORED,
        supersedesStateId: state.id,
      });
      verify(world, personId, null);
    },
  );

  it.each(REGIONS)(
    "%s uses current date and exclusive sequence on explicitly forged query controls",
    (usps) => {
      let world = smallWorld(usps);
      const personId = world.personOrder[0]!;
      let home: Dwelling;
      [world, home] = addDwelling(world, "fixture:home");
      const endpoint = { kind: "person", personId } as const;
      world = tenure(world, home, endpoint, "fixture:tenure");
      const beforeOccupancySequence = world.history.nextSequence;
      world = occupy(world, home, endpoint, "fixture:occupancy");
      verify(world, personId, home);
      // Deliberately inconsistent save projections: query-only controls, never serialized or passed to writers.
      const sequenceExcluded: World = {
        ...world,
        history: { ...world.history, nextSequence: beforeOccupancySequence },
      };
      expect(primaryDwellingOf(sequenceExcluded, personId)).toBeNull();
      expect(primaryDwellingOf(sequenceExcluded, personId)).toBe(
        inlinePrimaryDwelling(sequenceExcluded, personId),
      );
      const dateExcluded: World = { ...world, currentDate: YESTERDAY };
      expect(primaryDwellingOf(dateExcluded, personId)).toBeNull();
      expect(primaryDwellingOf(dateExcluded, personId)).toBe(
        inlinePrimaryDwelling(dateExcluded, personId),
      );
      const missingDwelling: World = {
        ...world,
        history: { ...world.history, dwellings: [] },
      };
      expect(primaryDwellingOf(missingDwelling, personId)).toBeNull();
      expect(primaryDwellingOf(missingDwelling, personId)).toBe(
        inlinePrimaryDwelling(missingDwelling, personId),
      );
    },
  );
});
